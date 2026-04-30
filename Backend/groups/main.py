from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Cookie
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from database import session, engine, Base
import database
from coolname import generate_slug
import os, jwt, httpx
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
from datetime import datetime, timedelta, timezone
import asyncio
import zipfile, io
from fastapi.responses import StreamingResponse
from json import loads
from struct import pack
from subprocess import run, PIPE
from tempfile import NamedTemporaryFile
app = FastAPI()

origins = [
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
    allow_origins=origins
)

Base.metadata.create_all(bind = engine)
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


client = httpx.AsyncClient()

@app.get("/groups")
def return_groups(db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    try:
        groups = db.execute(select(database.Group)).scalars().all()
        return groups
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Could not Fetch groups"}])
    
@app.get("/groups/{query}")
def return_groups(query : str, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    try:
        groups = db.execute(select(database.Group).where(database.Group.name.ilike(f"%{query}%")).limit(6)).scalars().all()
        return groups
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Could not Fetch groups"}])

@app.post("/addgroup")
def add_group(grpData : database.GrpAdd, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    try:
        already_exists = db.execute(select(database.Group.name, database.Group.owner).where((database.Group.name == grpData.name) | (database.Group.owner == username ))).mappings().one_or_none()
        if already_exists:
            if already_exists.name == grpData.name:
                raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail=[{"msg" : "A realm with this name already exists."}])
            else:
                raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail=[{"msg" : f"You already own one realm {already_exists.name}"}])
        db_data = database.Group(
            name = grpData.name,
            owner = grpData.owner,
            liveCount = grpData.liveCount,
            anyonymity = grpData.anonymity,
            maxGrpSize = grpData.maxGrpSize,
            maxDuration = grpData.maxDuration,
            minDuration = grpData.minDuration,
            grpType = grpData.grpType,
            inviteType = grpData.inviteType
        )
        db.add(db_data)
        db.commit()
        return {"msg" : "Success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Group Not Added"}])
    
@app.delete("/delete/{groupname}")
def del_group(groupname : str, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    try:
        db.execute(delete(database.Members).where(database.Members.grpName == groupname))
        exists = db.execute(select(database.Group).where(database.Group.name == groupname)).scalars().one_or_none()
        if not exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg" : "Group does not exists"}])
        db.delete(exists)
        db.commit()
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Group could not be deleted"}])
    return {"msg" : "Success"}

@app.get("/addmem/{group}")
def add_mem(group : str, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    try:
        already_exists = db.execute(select(database.Members).where((database.Members.name == username) & (database.Members.grpName == group))).scalar_one_or_none()
        if already_exists:
            raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail=[{"msg" : "Already joined"}])

        member = database.Members(
            name = username,
            grpName = group
        )
        db.add(member)
        db.commit()
    except HTTPException:
        raise
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "User could not be added"}])
    
@app.post("/delmem")
def del_user(memberData : database.MemberData, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    try:
        db.execute(delete(database.Members).where((database.Members.name == memberData.name) & (database.Members.grpName == memberData.grpName)))
        db.commit()
    except:
       raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "User could not be deleted"}])
    return {"msg" : "Success"}
    
@app.get("/{group}/members")
def get_members(group : str, db : Session = Depends(get_db)):
    try:
        members = db.execute(select(database.Members.name).where(database.Members.grpName == group)).scalars().all()
        return members
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Could not fetch members"}])
 
@app.get("/global/{group}/numMembers")
def num_members(group : str, db : Session = Depends(get_db)):
    try:
        members = db.execute(select(database.Members).where(database.Members.grpName == group)).scalars().all()
        return len(members)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Could not fetch members"}])
    
@app.get("/voice/{group}/numMembers")
def num_members(group : str, db : Session = Depends(get_db)):
    try:
        members = db.execute(select(database.Members).where(database.Members.grpName == group)).scalars().all()
        return len(members)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Could not fetch members"}])


class ConnectionManager:
    def __init__(self):
        self.connections : dict[tuple[str, str], WebSocket] = {}
    async def add_connection(self, websocket : WebSocket, username : str, grpName : str):
        await websocket.accept()
        self.connections[(username, grpName)] = websocket
    def disconnect(self, username : str, grpName : str):
      if (username, grpName) in self.connections:
        del self.connections[(username, grpName)]
    async def send_message(self, message : database.Msg_return, grpName : str):
        for user in self.connections:
            if user[1] == grpName:
                await self.connections[user].send_text(message)

manager = ConnectionManager()

# async def websoc(user : WebSocket, db : Session = Depends(get_db)):
@app.websocket("/ws/{group}")
async def websoc(group : str, user : WebSocket, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    MAX_TIME = payload["exp"]
    username = payload["username"]
    senderName = username
    await manager.add_connection(user, username, group)
    try:
        while True:
            
            try:
                data = await user.receive_json()
                if "anonymity" in data and data["anonymity"] == True:
                    
                    while True:
                        senderName = generate_slug(2)
                        response_username = await client.get(f"http://auth:8000/userCheck/{username}")
                        if response_username.json()["msg"] == False:
                            break
                        # already_exists = db.execute(select(Users).where(Users.username == username)).scalar_one_or_none()
                        # if not already_exists:
                        #     break
                seconds = int(data["expire"])
                msg = data["msg"]
                time = datetime.now(timezone.utc)
                message = database.grpMsgsT(
                    msg = msg,
                    username = senderName,
                    time_sent = time,
                    expiry = time + timedelta(seconds=seconds),
                    grpName = group 
                )
                temp = database.Msg_return.from_orm(message).model_dump_json()
                db.add(message)
                db.commit()
                await manager.send_message(temp, group)
            except WebSocketDisconnect:
                manager.disconnect(username, group)
                break
            except asyncio.TimeoutError:
                manager.disconnect(username, group)
                break
            except Exception as e:
                await user.send_text("An error occured")
                manager.disconnect(username, group)
                print("An exception occured", e)
                break
    finally:
        if username in manager.connections:
            manager.disconnect(username, group)

# async def send_messages(db : Session = Depends(get_db)):
@app.get("/getchatmsgs/{group}")
async def send_messages(group : str, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    time = datetime.now(timezone.utc) + timedelta(seconds=2)
    msgs = db.execute(select(database.grpMsgsT).where((database.grpMsgsT.expiry > time) & (database.grpMsgsT.grpName == group) )).scalars().all()
    msgs_return = []
    for msg in msgs:
        msgs_return.append(database.Msg_return.from_orm(msg))
    return {
        "msg" : "Success",
        "msgs" : msgs_return
    }

@app.get("/global/{group}/livecount")
def total_active(group : str, payload = Depends(verify_session_token)):
    count = 0
    for user in manager.connections:
        if user[1] == group:
            count += 1
    return {
        "msg" : "Success",
        "total": count
    }



class Connection_ManagerVoice:
    def __init__(self):
        self.connections : dict[tuple[str, str], WebSocket] = {}
    async def add_connection(self, websocket : WebSocket, username : str, grpName : str):
        await websocket.accept()
        self.connections[(username, grpName)] = websocket
    def disconnect(self, username : str, grpName : str):
      if (username, grpName) in self.connections:
        del self.connections[(username, grpName)]
    async def send_message(self, message : database.Msg_return, grpName : str):
        for user in self.connections:
            if user[1] == grpName:
                await self.connections[user].send_text(message)

managerV = Connection_ManagerVoice()


@app.websocket("/voice/ws/{group}")
async def voice_conn(group : str, user: WebSocket, payload = Depends(verify_session_token), db : Session = Depends(get_db)):
    username = payload["username"]
    await managerV.add_connection(user, username, group)
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
                        expiry = database.grpsMsgsV.get_expiry(expiry_seconds)
                        voicemsg = database.grpsMsgsV(
                             username = senderName,
                             msg = payload,
                             time_sent = time,
                             expiry = expiry,
                             grpName = group
                        )
                        db.add(voicemsg)
                        db.commit()
                        username_payload = senderName.encode("utf-8")
                        username_length = len(username_payload)
                        time_sent = pack(">d", time.timestamp())
                        expiry_time = pack(">d", expiry.timestamp())

                        complete_payload = time_sent + expiry_time + username_length.to_bytes(4, "big") + username_payload + payload
                        await manager.send_message(complete_payload, group)
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
         managerV.disconnect(username, group)

@app.get("/voice/getmsgs/{group}")
async def get_msgs(group : str, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    time = datetime.now(timezone.utc) + timedelta(seconds=2)
    db_data = db.execute(select(database.grpsMsgsV).where((database.grpsMsgsV.expiry > time) & (database.grpsMsgsV.grpName == group) )).scalars().all()
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


@app.get("/voice/{group}/livecount")
def total_active(group : str, payload = Depends(verify_session_token)):
    count = 0
    for user in managerV.connections:
        if user[1] == group:
            count += 1
    return {
        "msg" : "Success",
        "total": count
    }