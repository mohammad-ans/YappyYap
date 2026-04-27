from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query, status, HTTPException, Cookie
from database import session, Msgs, Msg_return, Base, engine
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from typing import Annotated
from datetime import datetime, timezone, timedelta
import asyncio
from coolname import generate_slug
import httpx
import os, jwt
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins=[
    "http://localhost:5173"
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


async def verify_session_token(session_token: Annotated[str | None, Cookie()] = None):
    payload = {"username" : "NA", "type" : "admin", "exp" : 0}
    return payload

# async def verify_session_token(session_token: Annotated[str | None, Cookie()] = None):
#     if not session_token:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg" : "No session found."}])
#     try:
#         payload = jwt.decode(session_token, PRIVATE_KEY, ALGORITHM)
#         if not payload:
#             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg": "Payload not found"}])
#         if not payload["username"]:
#             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg": "Username Not found"}])
#     except jwt.InvalidTokenError:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg": "Invalid Token"}])
#     except jwt.ExpiredSignatureError:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg" : "Expired Token"}])
#     return payload
 

class ConnectionManager:
    def __init__(self):
        self.connections : dict[str, WebSocket] = {}
    async def add_connection(self, websocket : WebSocket, username : str):
        await websocket.accept()
        self.connections[username] = websocket
    def disconnect(self, username : str):
      if username in self.connections:
        del self.connections[username]
    async def send_message(self, message : Msg_return):
        for user in self.connections:
            await self.connections[user].send_text(message)

manager = ConnectionManager()

# async def websoc(user : WebSocket, db : Session = Depends(get_db)):
@app.websocket("/ws/global")
async def websoc(user : WebSocket, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    MAX_TIME = payload["exp"]
    username = payload["username"]
    senderName = username
    await manager.add_connection(user, username)
    try:
        while True:
            
            try:
                data = await user.receive_json()
                if "anonymity" in data and data["anonymity"] == True:
                    client = httpx.AsyncClient()
                    while True:
                        senderName = generate_slug(2)
                        response_username = await client.get(f"http://auth:8000/userCheck/{username}")
                        if response_username.json()["msg"] == False:
                            break
                        # already_exists = db.execute(select(Users).where(Users.username == username)).scalar_one_or_none()
                        # if not already_exists:
                        #     break
                    await client.aclose()
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
                await manager.send_message(temp)
            except WebSocketDisconnect:
                manager.disconnect(username)
                break
            except asyncio.TimeoutError:
                manager.disconnect(username)
                break
            except Exception as e:
                await manager.connections[username].send_text("An error occured")
                manager.disconnect(username)
                print("An exception occured", e)
                break
    finally:
        if username in manager.connections:
            manager.disconnect(username)

# async def send_messages(db : Session = Depends(get_db)):
@app.get("/getchatmsgs/global")
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
def total_active(payload = Depends(verify_session_token)):
    return {
        "msg" : "Success",
        "total":len(manager.connections)
    }