from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import database
from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete, func, text
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Cookie
from sqlalchemy.orm import Session
import os, jwt, httpx
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
import asyncio
import datetime
from ws_manger import RedisWs
from dotenv import load_dotenv
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    await manager.start()
    yield
    await manager.stop()

app = FastAPI(lifespan=lifespan)

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


load_dotenv()
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

ALGORITHM = "HS256"

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

@app.get("/dms")
def personalMsgs(db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    user = payload["username"]
    msgs = []
    try:
        # Unread messages start their timer only when the receiver fetches them
        db.execute(update(database.PersonalMsgs).where(
            (database.PersonalMsgs.receiver == user)
            & (database.PersonalMsgs.defaultExpiration == None)
        ).values(defaultExpiration = (func.now() + text("duration * interval '1 second'"))))

        db.execute(update(database.GroupInvite).where(
            (database.GroupInvite.receiver == user)
            & (database.GroupInvite.defaultExpiration == None)
        ).values(defaultExpiration = (func.now() + text("duration * interval '1 second'"))))

        db.commit()

        curr_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=1)
        # Sent messages the receiver has not opened yet have no expiry and are still shown to the sender
        msgs = db.execute(select(database.PersonalMsgs).where(
            ((database.PersonalMsgs.sender == user) | (database.PersonalMsgs.receiver == user))
            & ((database.PersonalMsgs.defaultExpiration > curr_time) | (database.PersonalMsgs.defaultExpiration == None))
            )).scalars().all()
        invites = db.execute(select(database.GroupInvite).where(
            ((database.GroupInvite.sender == user) | (database.GroupInvite.receiver == user))
            & ((database.GroupInvite.defaultExpiration > curr_time) | (database.GroupInvite.defaultExpiration == None))
            )).scalars().all()
        msgs.extend(invites)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Messages could not be fetched"}])
    return msgs


async def user_online(username):
    if manager.redis is None:
        return manager_local.is_connected(username)
    try:
        return bool(await manager.redis.sismember("personalchats:online" ,username))
    except:
        return manager_local.is_connected(username)

async def user_exists(username: str):
    try:
        response = await client.get(f"http://auth:8000/userCheck/{username}")
        return response.json()["msg"] == True
    except:
        return False

async def mark_online(username: str, online: bool):
    if manager.redis is None:
        return
    try:
        if online:
            await manager.redis.sadd("personalchats:online", username)
        else:
            await manager.redis.srem("personalchats:online", username)
    except Exception:
        pass

class ConnectionManager:
    # A user can have several tabs open, so each username maps to a set of sockets
    def __init__(self):
        self.connections : dict[str, set[WebSocket]] = {}
    def add_connection(self, websocket : WebSocket, username : str):
        self.connections.setdefault(username, set()).add(websocket)
    def disconnect(self, websocket : WebSocket, username : str):
        sockets = self.connections.get(username)
        if sockets is None:
            return
        sockets.discard(websocket)
        if not sockets:
            del self.connections[username]
    def is_connected(self, username : str):
        return username in self.connections
    async def send_message(self, message, username):
        sent = False
        for ws in list(self.connections.get(username, ())):
            try:
                await ws.send_text(message)
                sent = True
            except:
                self.disconnect(ws, username)
        return sent

manager_local = ConnectionManager()
client = httpx.AsyncClient(timeout=5.0)

async def dm_event(data: dict):
    for user in (data["sender"], data["receiver"]):
        await manager_local.send_message(data["payload"], user)

manager = RedisWs(grp="personalchats:dm", on_event=dm_event)

@app.websocket("/ws/main")
async def websoc(user : WebSocket, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    await user.accept()
    manager_local.add_connection(user, username)
    await mark_online(username, True)
    try:
        while True:
            
            try:
                data = await asyncio.wait_for(user.receive_json(), 30)
            except asyncio.TimeoutError:
                try:
                    await user.send_json({"type": "ping"})
                except (asyncio.TimeoutError, Exception):
                    break
                continue
            if data.get("type") == "pong":
                continue
            if "recipient" in data:
                secondUser = data["recipient"]
                if secondUser == username or not await user_exists(secondUser):
                    await user.send_json({"type": "error", "msg": f"User {secondUser} does not exist"})
                    continue
                timeCurr = datetime.datetime.now(datetime.timezone.utc)
                defaultExpiration = data["defaultExpiration"]
                
                if defaultExpiration == True:
                    exp = timeCurr + datetime.timedelta(seconds=data["duration"])
                else:
                    exp = None
                    if await user_online(secondUser):
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
                db.commit()

                await manager.publish({"payload": msg, "sender": username, "receiver": secondUser})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(e)
    finally:
        manager_local.disconnect(user, username)
        if not manager_local.is_connected(username):
            await mark_online(username, False)


@app.delete("/users/me")
def delete_user_msgs(db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    # Called before an account is deleted: removes every DM and invite DM the user sent or received
    username = payload["username"]
    db.execute(delete(database.PersonalMsgs).where((database.PersonalMsgs.sender == username) | (database.PersonalMsgs.receiver == username)))
    db.execute(delete(database.GroupInvite).where((database.GroupInvite.sender == username) | (database.GroupInvite.receiver == username)))
    db.commit()
    return {"msg": "Success"}

@app.get("/livecount/{user}")
async def check_user(user : str, payload = Depends(verify_session_token)):
    online = await user_online(user)
    return {"msg" : "Success", "total" : "online" if online else "offline"}