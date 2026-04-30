from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Cookie, status, HTTPException
from database import session, VoiceMsgs, Base, engine
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from tempfile import NamedTemporaryFile
from subprocess import run, PIPE
from fastapi.responses import StreamingResponse
import io
import zipfile
import os
from json import loads
from struct import pack
from coolname import generate_slug
import httpx
from typing import Annotated
import jwt
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

app = FastAPI()

load_dotenv()

origins=[
     "http://localhost:5173",
    "https://yappyyap.xyz"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
ALGORITHM = "HS256"
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

def get_db():
    with session() as db:
        yield db

client = httpx.AsyncClient(timeout=5.0)


# async def verify_session_token(session_token: Annotated[str | None, Cookie()] = None):
#     payload = {"username" : "NA", "type" : "admin", "exp" : 0}
#     return payload

async def verify_session_token(session_token: Annotated[str | None, Cookie()] = None):
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg" : "No session found."}])
    try:
        payload = jwt.decode(session_token, PRIVATE_KEY, ALGORITHM)
        if not payload:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Payload not found"}])
        if not payload["username"]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Username Not found"}])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Invalid Token"}])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg" : "Expired Token"}])
    return payload
     

class Connection_Manager:
    def __init__(self):
        self.active_connections : dict[str, WebSocket] = {}
    async def add_connection(self, websocket : WebSocket, username  : str):
        await websocket.accept()
        self.active_connections[username] = websocket
    def disconnect(self, username : str):
         if username in self.active_connections:
              del self.active_connections[username]
    async def send_message(self, message):
         for connection in self.active_connections:
              await self.active_connections[connection].send_bytes(message)

manager = Connection_Manager()


@app.websocket("/voice/ws/voice")
async def voice_conn(user: WebSocket, payload = Depends(verify_session_token), db : Session = Depends(get_db)):
    username = payload["username"]
    await manager.add_connection(user, username)
    senderName = username
    try:
        expiry_seconds = 0
        while True:
            data = await user.receive()
            if "bytes" in data:
                time = datetime.now(timezone.utc)
                try:
                    with NamedTemporaryFile(suffix=".webm", delete=False) as temp_input:
                        temp_input.write(data["bytes"])
                        temp_input.flush()
                        output_tmp = NamedTemporaryFile(suffix=".webm", delete=False)
                        output_tmp.close()
                        voice_convert = run([
                            'ffmpeg',
                            '-y',
                            '-i', temp_input.name,
                            '-af', "asetrate=55000,atempo=0.85,afftfilt=real='hypot(re,im)*sin(65)',tremolo=f=50,adynamicsmooth=sensitivity=2.5:basefreq=10000",
                            output_tmp.name
                        ],
                        stdout=PIPE,
                        stderr=PIPE
                        )
                        if voice_convert.returncode !=0:
                            await user.send_text("An error occured")
                            break
                    with open(output_tmp.name, "rb") as return_file:
                        payload = return_file.read()
                        expiry = VoiceMsgs.get_expiry(expiry_seconds)
                        voicemsg = VoiceMsgs(
                             username = senderName,
                             msg = payload,
                             time_sent = time,
                             expiry = expiry
                        )
                        db.add(voicemsg)
                        db.commit()
                        username_payload = senderName.encode("utf-8")
                        username_length = len(username_payload)
                        time_sent = pack(">d", time.timestamp())
                        expiry_time = pack(">d", expiry.timestamp())

                        complete_payload = time_sent + expiry_time + username_length.to_bytes(4, "big") + username_payload + payload
                        await manager.send_message(complete_payload)
                except WebSocketDisconnect:
                    print("closed")
                except Exception as e:
                    print(e)
                    try:
                        await user.send_text("An error occured")
                    except:
                         pass
                #     break
                finally:
                    os.remove(temp_input.name)
                    os.remove(output_tmp.name)

            elif "text" in data:
                js = loads(data["text"])
                if "anonymity" in js:
                    while True:
                        senderName = generate_slug(2)
                        response_username = await client.get(f"http://auth:8000/userCheck/{username}")
                        if response_username.json()["msg"] == False:
                            break
                        # already_exists = db.execute(select(Users).where(Users.username == username)).scalar_one_or_none()
                        # if not already_exists:
                        #      break
                expiry_seconds = int(js["expiry"])
    except WebSocketDisconnect:
         print("closed")
    except Exception as e:
                    print(e)
                    try:
                        await user.send_text("An error occured")
                    except:
                         pass
    finally:
         print("Disconnet")
         manager.disconnect(username)

@app.get("/voice/getmsgs/voice")
async def get_msgs(db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    time = datetime.now(timezone.utc) + timedelta(seconds=2)
    db_data = db.execute(select(VoiceMsgs).where(VoiceMsgs.expiry > time)).scalars().all()
    zip_file = io.BytesIO()
    with zipfile.ZipFile(zip_file, mode="w") as zipF:
        for msg in db_data:
            expiry = pack(">d", msg.expiry.timestamp())
            time_sent = pack(">d", msg.time_sent.timestamp())
            username  =  msg.username.encode("utf-8")
            zipF.writestr(msg.username + str(msg.expiry), time_sent + expiry + len(username).to_bytes(4, "big") + username + msg.msg)
    zip_file.seek(0)
    return StreamingResponse(zip_file)


# @app.get("/accountmsgs")
# def account_msgs(db : Session = Depends(get_db), pd = Depends(verify_session_token)):
#     time = datetime.now(timezone.utc) + timedelta(seconds=2)
#     msgs = db.execute(select(VoiceMsgs).where(VoiceMsgs.expiry > time)).scalars().all()
#     payload = []
#     for msg in msgs:
#          temp = {"expiry" : msg.expiry, "time_sent" : msg.time_sent, "type" : "Voice"}
#          payload.append(temp)
#     msgs = db.execute(select(Msgs).where(Msgs.expiry > time)).scalars().all()
#     for msg in msgs:
#          payload.append(Msg_return.from_orm(msg))
#     return {"msgs" : payload}


@app.get("/voice/livecount")
def total_active(payload = Depends(verify_session_token)):
    return {
        "msg" : "Success",
        "total":len(manager.active_connections)
    }