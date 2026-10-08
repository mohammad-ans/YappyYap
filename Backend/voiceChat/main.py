from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Cookie, status, HTTPException
from database import session, VoiceMsgs, Base, engine
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from tempfile import TemporaryDirectory
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
import jwt, ws_manger, asyncio, base64
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
     await manager.start()
     yield
     await manager.stop()

app = FastAPI(lifespan=lifespan)

load_dotenv()

origins=[
     "http://localhost:5173",
    "https://yappyyap.online"
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
    # Keyed by socket so the same user can have several tabs open
    def __init__(self):
        self.active_connections : dict[int, tuple[str, WebSocket]] = {}
    def add_connection(self, websocket : WebSocket, username  : str):
        self.active_connections[id(websocket)] = (username, websocket)
    def disconnect(self, websocket : WebSocket):
        self.active_connections.pop(id(websocket), None)
    def is_connected(self, username : str):
        return any(user == username for user, _ in self.active_connections.values())
    def count(self):
        return len({user for user, _ in self.active_connections.values()})
    async def send_message(self, message):
        for key, (user, ws) in list(self.active_connections.items()):
            try:
                await ws.send_bytes(message)
            except:
                self.active_connections.pop(key, None)

manager_local = Connection_Manager()

async def convert_voice(raw: bytes):
    # Applies the voice filter; temp files are always cleaned up, returns None if ffmpeg fails
    with TemporaryDirectory() as tmp:
        input_path = os.path.join(tmp, "input.webm")
        output_path = os.path.join(tmp, "output.webm")
        with open(input_path, "wb") as f:
            f.write(raw)
        voice_convert = await asyncio.to_thread(run, [
            'ffmpeg',
            '-y',
            '-i', input_path,
            '-af', "asetrate=55000,atempo=0.85,afftfilt=real='hypot(re,im)*sin(65)',tremolo=f=50,adynamicsmooth=sensitivity=2.5:basefreq=10000",
            output_path
        ],
        stdout=PIPE,
        stderr=PIPE
        )
        if voice_convert.returncode != 0:
            return None
        with open(output_path, "rb") as f:
            return f.read()
async def on_event(data):
     await manager_local.send_message(base64.b64decode(data["payload_b64"]))

async def mark_online(manager: ws_manger.RedisWs, username: str, online: bool):
    if manager.redis is None:
         return
    try:
        if online:
              await manager.redis.sadd("voicechat:online", username)
        else:
            await manager.redis.srem("voicechat:online", username)
    except:
        pass

manager = ws_manger.RedisWs(grp="voicechat:global", on_event=on_event)

@app.websocket("/voice/ws/global-voice")
async def voice_conn(user: WebSocket, payload = Depends(verify_session_token), db : Session = Depends(get_db)):
    username = payload["username"]
    senderName = username
    await user.accept()
    manager_local.add_connection(user, username)
    await mark_online(manager, username, True)
    try:
        expiry_seconds = 0
        while True:
            try:
                try:
                    data = await asyncio.wait_for(user.receive(), 30)
                except asyncio.TimeoutError:
                    try:
                        await user.send_json({"type": "ping"})
                    except:
                        break
                    continue
                if data["type"] == "websocket.disconnect":
                    break
                if data.get("bytes") is not None:
                    time = datetime.now(timezone.utc)
                    audio = await convert_voice(data["bytes"])
                    if audio is None:
                        await user.send_json({"type": "error", "msg": "Voice message could not be processed"})
                        continue
                    expiry = VoiceMsgs.get_expiry(expiry_seconds)
                    voicemsg = VoiceMsgs(
                         username = senderName,
                         msg = audio,
                         time_sent = time,
                         expiry = expiry
                    )
                    db.add(voicemsg)
                    db.commit()
                    username_payload = senderName.encode("utf-8")
                    username_length = len(username_payload)
                    time_sent = pack(">d", time.timestamp())
                    expiry_time = pack(">d", expiry.timestamp())

                    complete_payload = time_sent + expiry_time + username_length.to_bytes(4, "big") + username_payload + audio
                    await manager.publish({"payload_b64": base64.b64encode(complete_payload).decode("ascii")})

                elif data.get("text") is not None:
                    js = loads(data["text"])
                    if js.get("type") == "pong":
                        continue
                    if "anonymity" in js and js["anonymity"]:
                        while True:
                            senderName = generate_slug(2)
                            response_username = await client.get(f"http://auth:8000/userCheck/{senderName}")
                            if response_username.json()["msg"] == False:
                                break
                    else:
                        senderName = username
                    expiry_seconds = int(js["expiry"])
            except WebSocketDisconnect:
                break
            except Exception as e:
                try:
                    await user.send_json({"type": "error", "msg": "An error occured"})
                except:
                    break
    finally:
         manager_local.disconnect(user)
         if not manager_local.is_connected(username):
             await mark_online(manager, username, False)

@app.get("/voice/getmsgs/global-voice")
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
async def total_active(payload = Depends(verify_session_token)):
    if manager.redis is not None:
        try:
            total = await manager.redis.scard("voicechat:online")
            return {"msg": "Success", "total": total}
        except:
            pass
    return {
        "msg" : "Success",
        "total": manager_local.count()
    }