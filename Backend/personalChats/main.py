from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import database
from sqlalchemy.orm import Session
from sqlalchemy import select, update, func, text
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Cookie
from sqlalchemy.orm import Session
from coolname import generate_slug
import os, jwt, httpx
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
import asyncio
import json
from redis.asyncio import Redis
import datetime
import time
from dotenv import load_dotenv

app = FastAPI()

load_dotenv()
origins = [
    "http://localhost:5173",
    "https://yappyyap.xyz"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_headers=["*"],
    allow_methods=["*"],
    allow_credentials= True
)
database.Base.metadata.create_all(bind=database.engine)
def get_db():
    with database.session() as db:
        yield db


PRIVATE_KEY = os.getenv("PRIVATE_KEY")
ALGORITHM = "HS256"

# async def verify_session_token(session_token: Annotated[str | None, Cookie()] = None):
#     payload = {"username" : "NA", "type" : "admin", "exp" : 0}
#     return payload

async def verify_session_token(session_token: Annotated[str | None, Cookie()] = None):
    if not session_token:
        print(1)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg" : "No session found."}])
    try:
        payload = jwt.decode(session_token, PRIVATE_KEY, ALGORITHM)
        if not payload:
            print(2)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Payload not found"}])
        if not payload["username"]:
            print(3)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Username Not found"}])
    except jwt.InvalidTokenError:
        print(4)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Invalid Token"}])
    except jwt.ExpiredSignatureError:
        print(5)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg" : "Expired Token"}])
    return payload

@app.get("/dms")
def personalMsgs(db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    user = payload["username"]
    msgs = []
    try:
        db.execute(update(database.PersonalMsgs).where(
            ((database.PersonalMsgs.sender == user) | (database.PersonalMsgs.receiver == user))
            & (database.PersonalMsgs.defaultExpiration == None)
        ).values(defaultExpiration = (func.now() + text("duration * interval '1 second'"))))

        db.execute(update(database.GroupInvite).where(
            ((database.GroupInvite.sender == user) | (database.GroupInvite.receiver == user))
            & (database.GroupInvite.defaultExpiration == None)
        ).values(defaultExpiration = (func.now() + text("duration * interval '1 second'"))))

        db.commit()

        curr_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=1)
        msgs = db.execute(select(database.PersonalMsgs).where(
            ((database.PersonalMsgs.sender == user) | (database.PersonalMsgs.receiver == user))
            & (database.PersonalMsgs.defaultExpiration > curr_time)
            )).scalars().all()
        invites = db.execute(select(database.GroupInvite).where(
            ((database.GroupInvite.sender == user) | (database.GroupInvite.receiver == user))
            & (database.GroupInvite.defaultExpiration > curr_time)
            )).scalars().all()
        msgs.extend(invites)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Messages could not be fetched"}])
    return msgs



# redis = Redis(host="redis", port=6379)


# @app.on_event("startup")
# async def start_listen():
#     asyncio.create_task(listen_async())


class ConnectionManager:
    def __init__(self):
        self.connections : dict[str, WebSocket] = {}
    async def add_connection(self, websocket : WebSocket, username : str):
        await websocket.accept()
        self.connections[username] = websocket
    def disconnect(self, username : str):
      if username in self.connections:
        del self.connections[username]
    async def send_message(self, message, username):
        try:
            await self.connections[username].send_text(message)
            return True
        except:
            return False

            
        # if self.connections[username]:
        #     await self.connections[username].send_json(message)



    
manager = ConnectionManager()

# async def listen_async():
#     pubsub = redis.pubsub()
#     await pubsub.subscribe("notifications")

#     async for msg in pubsub.listen():
#         try:
#             if msg["type"] == "message":
#                 data = json.load(msg["data"]) 
#                 await manager.send_message(data["username"], {"notification" : data["msg"]})
#         except:
#             pass

# async def websoc(user : WebSocket, db : Session = Depends(get_db)):
# async def websoc(user : WebSocket, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
@app.websocket("/ws/main")
async def websoc(user : WebSocket, db : Session = Depends(get_db)):
    print("reached here")
    MAX_TIME = "payload"
    username = "payload"
    await manager.add_connection(user, username)
    try:
        while True:
            
            try:
                data = await user.receive_json()
                if "recipient" in data:
                    secondUser = data["recipient"]
                    timeCurr = datetime.datetime.now(datetime.timezone.utc)
                    defaultExpiration = data["defaultExpiration"]
                    
                    if defaultExpiration == True:
                        exp = timeCurr + datetime.timedelta(seconds=data["duration"])
                    else:
                        exp = None
                        if secondUser in manager.connections:
                            exp = timeCurr + datetime.timedelta(seconds=data["duration"])
                    msg = ""
                    if "type" in data:
                        message = database.GroupInvite(
                            sender = username, 
                            receiver = secondUser,
                            group = data["msg"],
                            sentTime = timeCurr,
                            duration = data["duration"],
                            defaultExpiration = exp
                        )
                        msg = database.Msg_invite.from_orm(message).model_dump_json()

                    else:
                        message = database.PersonalMsgs(
                            sender = username, 
                            receiver = secondUser,
                            msg = data["msg"],
                            sentTime = timeCurr,
                            duration = data["duration"],
                            defaultExpiration = exp
                        )
                        msg = database.Msg_return.from_orm(message).model_dump_json()
                    db.add(message)
                    if(not await manager.send_message(msg, secondUser) and not defaultExpiration):
                        message.defaultExpiration = None
                    db.commit()
            except WebSocketDisconnect:
                manager.disconnect(username)
                break
            except asyncio.TimeoutError:
                manager.disconnect(username)
                break
            except Exception as e:
                print(e)
                manager.disconnect(username)
                break
    finally:
        if username in manager.connections:
            manager.disconnect(username)

@app.get("/livecount/{user}")
def check_user(user : str, payload = Depends(verify_session_token)):
    for conn in manager.connections:
        if user == conn:
            return {"msg" : "Success", "total" : "online"}
    return {"msg" : "Success", "total" : "offline"}