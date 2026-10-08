from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query, status, HTTPException, Cookie
from database import session, Msgs, Msg_return, Base, engine
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from typing import Annotated
from datetime import datetime, timezone, timedelta
import asyncio
from coolname import generate_slug
import httpx
import os, jwt, ws_manger
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    await manager.start()
    yield
    await manager.stop()
    client.aclose()

app = FastAPI(lifespan=lifespan)

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
client = httpx.AsyncClient(timeout=5.0)

def get_db(): 
    with session() as db:
        yield db


async def verify_session_token(session_token: Annotated[str | None, Cookie()] = None):
    payload = {"username" : "NA", "type" : "admin", "exp" : 0}
    return payload

# async def verify_session_token(session_token: Annotated[str | None, Cookie()] = None):
#     if not session_token:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg" : "No session found."}])
#     try:
#         payload = jwt.decode(session_token, PRIVATE_KEY, ALGORITHM)
#         if not payload:
#             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Payload not found"}])
#         if not payload["username"]:
#             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Username Not found"}])
#     except jwt.InvalidTokenError:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Invalid Token"}])
#     except jwt.ExpiredSignatureError:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg" : "Expired Token"}])
#     return payload
 

class ConnectionManager:
    def __init__(self):
        self.connections : dict[str, WebSocket] = {}
    def add_connection(self, websocket : WebSocket, username : str):
        self.connections[username] = websocket
    def disconnect(self, username : str):
      if username in self.connections:
        del self.connections[username]
    async def send_message(self, message : Msg_return):
        for user in self.connections:
            await self.connections[user].send_text(message)

manager_local = ConnectionManager()

async def on_event(data):
    await manager_local.send_message(data["payload"])

manager = ws_manger.RedisWs(grp="textchat:global", on_event=on_event)

async def mark_online(manager: ws_manger.RedisWs, username: str, online: bool):
    if manager.redis is None:
        return
    try:
        if online:
            await manager.redis.sadd("textchat:online", username)
        else:
            await manager.redis.srem("textchat:online", username)
    except:
        pass

@app.websocket("/ws/global-text")
async def websoc(user : WebSocket, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    MAX_TIME = payload["exp"]
    username = payload["username"]
    senderName = username
    await user.accept()
    manager_local.add_connection(user, username)
    await mark_online(manager, username, True)
    try:
        while True:
            
            try:
                data = await asyncio.wait_for(user.receive_json(), timeout=30)
            except asyncio.TimeoutError:
                try:
                    await user.send_json({"type": "ping"})
                except:
                    break
                continue
            if data.get("type") == "pong":
                continue
            if "anonymity" in data and data["anonymity"] == True:
                while True:
                    senderName = generate_slug(2)
                    response_username = await client.get(f"http://auth:8000/userCheck/{senderName}")
                    if response_username.json()["msg"] == False:
                        break
            else:
                senderName = username
            seconds = int(data["expire"])
            msg = data["msg"]
            time = datetime.now(timezone.utc)
            message = Msgs(
                msg = msg,
                username = senderName,
                time_sent = time,
                expiry = time + timedelta(seconds=seconds)
            )
            temp = Msg_return.from_orm(message).model_dump_json()
            db.add(message)
            db.commit()
            await manager.publish({"payload": temp})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await user.send_text("An error occured")
        except:
            pass
    finally:
        if username in manager_local.connections:
            manager_local.disconnect(username)
        await mark_online(manager, username, False)

# async def send_messages(db : Session = Depends(get_db)):
@app.get("/getchatmsgs/global-text")
async def send_messages(db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    time = datetime.now(timezone.utc) + timedelta(seconds=2)
    msgs = db.execute(select(Msgs).where(Msgs.expiry > time)).scalars().all()
    msgs_return = []
    for msg in msgs:
        msgs_return.append(Msg_return.from_orm(msg))
    return {
        "msg" : "Success",
        "msgs" : msgs_return
    }

@app.get("/global/livecount")
async def total_active(payload = Depends(verify_session_token)):
    if manager.redis is not None:
        try:
            total = await manager.redis.scard("textchat:online")
            return {"msg": "Success", "total": total}
        except:
            pass
    return {
        "msg" : "Success",
        "total":len(manager_local.connections)
    }