from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Cookie
from sqlalchemy.orm import Session
from sqlalchemy import select, delete, update, func
from database import session, engine, Base
import database
from coolname import generate_slug
import os, jwt, httpx
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
from datetime import datetime, timedelta, timezone
import asyncio
import zipfile, io, base64
from fastapi.responses import StreamingResponse
from json import loads
from struct import pack
from subprocess import run, PIPE
from tempfile import NamedTemporaryFile
from dotenv import load_dotenv
import ws_manger
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await manager.start
    yield
    await manager.stop()

app = FastAPI(lifespan=lifespan)

load_dotenv()

origins = [
    "http://localhost:5173",
    "https://yappyyap.xyz"
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


client = httpx.AsyncClient()

@app.get("/invites/{token}/preview")
def invite(token: str, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    invite = db.execute(select(database.Invite).where(database.Invite.token == token)).scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Invite not found"}])
    realm = db.execute(select(database.Realm).where(database.Realm.id == invite.realm_id)).scalar_one_or_none()
    grp = None
    if invite.grpId:
        grp = db.execute(select(database.Group).where(database.Group.id == invite.grpId)).scalar_one_or_none()
    valid, reason = valid_invite(invite, username)
    valid_user = invite.username == username
    return database.InvitePreview(scope=invite.scope, realm_name=realm.name, name=grp.name if grp else None, invitedBy=invite.invitedBy, valid=valid, reason=reason, valid_user=valid_user)

@app.post("/realms/{id}/members/add")
def add_mem(id: str, data: database.Username, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    if not member or member.role == "member":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Only realm owner and admins can add members"}])
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == data.username))).scalar_one_or_none()
    if member:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=[{"msg": "User is already in realm"}])
    db.add(database.RMembers(realm_id=id, username=data.username, role="member"))
    db.commit()
    return {"msg": "Success"}

@app.post("/invites/realm/{id}")
def invite_realm(id: str, data: database.InviteCreate, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    if not member or member.role == "member":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=[{"msg": "Only realm admins and owner can send invites to members"}])
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == data.username))).scalar_one_or_none()
    if member:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, status=[{"msg": "User is already in the realm"}])
    invite = database.Invite(realm_id=id, grpId=None, invitedBy=username, username=data.username, 
                             expiresAt= datetime.now(timezone.utc) + timedelta(hours=data.expiresInHours), scope="realm")
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite

@app.post("/realms/{id}/make-owner")
def make_owner(id: str, data: database.Username, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    owner = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username) & (database.RMembers.role == "owner"))).scalar_one_or_none()
    if not owner:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Only realm owner can change ownership of realm"}])
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == data.username))).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "User must be a member of realm first to make them owner"}])
    owner.role = "admin"
    member.role = "owner"
    db.commit()
    return {"msg": "Success"}

@app.post("/realms/{id}/leave")
def leave_realm(id: str, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "You are not a member of this realm"}])
    if member.role == "owner":
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=[{"msg": "Owner cannot leave realms, make someone else owner or delete the realm"}])
    owned = db.execute(select(database.Group).where((database.Group.realm_id == id) & (database.Group.owner == username))).scalars.all()
    for group in owned:
        db.execute(delete(database.Members).where(database.Members.grpId == group.id))
        db.execute(delete(database.grpMsgsT).where(database.grpMsgsT.grpId == group.id))
        db.execute(delete(database.grpsMsgsV).where(database.grpsMsgsV.grpId == group.id))
        db.execute(delete(database.Group).where(database.Group.id == group.id))
    db.execute(delete(database.Members).where(database.Members.name == username))
    db.execute(delete(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username)))
    db.commit()
    return {"msg": "Success"}

@app.patch("/realms/{id}/members")
def mem_role_realm(id: str, data: database.MemberUpdate, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    if not member or member.role != "owner":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Only realm owner can update roles "}])
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == data.name))).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "User is not a member of this realm"}])
    if member.role == "owner":
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=[{"msg": "You cannot change role of owner, owner can transfer its ownership"}])
    member.role = data.role
    db.commit()
    return {"msg": "Success"}

@app.post("/realms/{id}/members/{user}/remove")
def remove_user(id: str, user: str, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    member = db.execute(select(database.RMembers).where((database.RMembers.username == username) & (database.RMembers.realm_id == id))).scalar_one_or_none()
    if not member or member.role == "member":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "Only realm owner and admins can delete users"}])
    del_user = db.execute(select(database.RMembers).where((database.RMembers.username == user) & (database.RMembers.realm_id == id))).scalar_one_or_none()
    if not del_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "User to be deleted not found"}])
    if del_user.role == "owner":
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=[{"msg": "Owner cannot be removed from the realm"}])
    owned = db.execute(select(database.Group).where((database.Group.realm_id == id) & (database.Group.owner == user))).scalar_one_or_none()
    for grp in owned:
        db.execute(delete(database.Members).where(database.Members.grpId == grp.id))
        db.execute(delete(database.grpMsgsT).where(database.grpMsgsT.grpId == grp.id))
        db.execute(delete(database.grpsMsgsV).where(database.grpsMsgsV.grpId == grp.id))
        db.execute(delete(database.Group).where(database.Group.id == grp.id))
    db.execute(delete(database.Members).where(database.Members.name == user))
    db.execute(delete(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == user)))
    db.commit()
    return {"msg": "Success"}

@app.get("/realms/{id}/groups/{group}/details")
def grp_details(id: str, group: str, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    grp = db.execute(select(database.Group).where((database.Group.realm_id == id) & (database.Group.id == group))).scalar_one_or_none()
    if not grp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Channel not found"}])
    member = db.execute(select(database.Members).where((database.Members.name == username) & (database.Members.grpId == group))).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "You are not a member of this channel"}])
    details = database.GroupDetails.model_validate(grp)
    details.memberCount = db.execute(select(func.count()).select_from(database.Members).where(database.Members.grpId == group)).scalar_one()
    details.role = member.role
    return details

@app.post("/realms/{id}/groups/{group}/make-owner")
def make_owner(id: str, group: str, data: database.Username, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    grp = db.execute(select(database.Group).where((database.Group.realm_id == id) & (database.Group.id == group))).scalar_one_or_none()
    if not grp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Channel not found"}])
    owner = db.execute(select(database.Members).where((database.Members.grpId == group) & (database.Members.name == username))).scalar_one_or_none()
    if not owner or owner.role != "owner":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "You are not allowed to transfer ownership"}])
    member = db.execute(select(database.Members).where((database.Members.grpId == group) & (database.Members.name == data.username))).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Selected user for owner not found"}])
    owner.role = "admin"
    member.role = "owner"
    grp.owner = data.username
    db.commit()
    return {"msg": "Success"}

@app.post("/invites/group/{id}/{group}")
def invite_user(id: str, group: str, data: database.InviteCreate, db: Session = Depends(get_db), payload=Depends(verify_session_token)):
    username = payload["username"]
    grp = db.execute(select(database.Group).where((database.Group.realm_id == id) & (database.Group.id == group))).scalar_one_or_none()
    if not grp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    grp_member = db.execute(select(database.Members).where((database.Members.grpId == group) & (database.Members.name == username))).scalar_one_or_none()
    if not (member and (member.role != "admin" or member.role != "admin")) and not (grp_member and (grp_member.role != "admin" or grp_member.role != "owner")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You are not allowed to invite users")
    invited = db.execute(select(database.Members).where((database.Members.grpId == group) & (database.Members.name == data.username))).scalar_one_or_none()
    if invited:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=[{"msg": "User is already in the channel"}])
    count = db.execute(select(func.count()).select_from(database.Members).where(database.Members.grpId == group)).scalar_one()
    if count >= grp.maxGrpSize:
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=[{"msg": "Max channel size reached"}])
    invite = database.Invite(
        scope = "group", realm_id = id, grpId = group, invitedBy = username, username = data.username, expiresAt = datetime.now(timezone.utc) + timedelta(hours=data.expiresInHours)
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite

def valid_invite(invite: database.Invite, username: str):
    if invite.used:
        return False, "Invite is used"
    if invite.canceled:
        return False, "Invite is cancelled"
    if invite.expiresAt and invite.expiresAt < datetime.now(timezone.utc):
        return False, "Invite is expired"
    if invite.username != username:
        return False, f"Invite is for {invite.username}"
    return True

@app.post("/invites/{token}/redeem")
def use_invite(token: str, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    invite = db.execute(select(database.Invite).where(database.Invite.token == token)).scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "No invite found"}])
    valid, reason = valid_invite(invite, username)
    if not valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": reason}])
    grp = db.execute(select(database.Group).where((database.Group.id == invite.grpId) & (database.Group.realm_id == invite.realm_id))).scalar_one_or_none()
    if not grp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Channel could have been deleted as it does not exists"}])
    count = db.execute(select(func.count()).select_from(database.Members).where(database.Members.grpId == invite.grpId)).scalar_one()
    if count >= grp.maxGrpSize:
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=[{"msg": "Channel has reached max size"}])
    member = db.execute(select(database.RMembers).where(database.RMembers.realm_id == invite.realm_id)).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=[{"msg": "You need to be in the realm to join its channels"}])
    grp_member = db.execute(select(database.Members).where(database.Members.grpId == invite.grpId)).scalar_one_or_none()
    if not grp_member:
        db.add(database.Members(grpId = invite.grpId, name = username, role = "member"))
    invite.used = True
    invite.usedAt = datetime.now(timezone.utc)
    db.commit()
    return {"msg": "Success", "realm_id": invite.realm_id, "grpId": invite.grpId}

@app.patch("/realms/{id}/groups/{group}/members")
def update_mem(id: str, group: str, data: database.MemberUpdate, db: Session = Depends(get_db), payload= Depends(verify_session_token)):
    username = payload["username"]
    grp = db.execute(select(database.Group).where((database.Group.realm_id == id) & (database.Group.id == group))).scalar_one_or_none()
    if not grp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Channel not found"}])
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    grp_member = db.execute(select(database.Members).where((database.Members.grpId == group) & (database.Members.name == username))).scalar_one_or_none()
    if not (member and member.role != "owner") and not (grp_member and grp_member.role != "owner"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "You are not allowed to change role of members"}])
    update_user = db.execute(select(database.Members).where((database.Members.name == data.name) & (database.Members.grpId == group))).scalar_one_or_none()
    if not update_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "User not found"}])

@app.post("/realms/{id}/group/{group}/leave")
def leave_group(id: str, group: str, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    grp = db.execute(select(database.Group).where((database.Group.realm_id == id) & (database.Group.id == group))).scalar_one_or_none()
    if not grp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Channel not found"}])
    member = db.execute(select(database.Members).where((database.Members.name == username) & (database.Members.grpId == group))).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "You are not a member of this channel"}])
    if member.role == "owner":
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=[{"msg": "Owner cannot leave channel, delete the channel or make someone else owner of the channel"}])
    db.execute(delete(database.Members).where((database.Members.name == username) & (database.Members.grpId == group)))
    db.commit()
    return {"msg": "Success"}

@app.get("/groups/{id}/numMembers")
def get_members(db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    count = db.execute(select(func.count()).select_from(database.Members).where(database.Members.grpId == id)).scalar_one()
    return count

@app.get("/realms")
def get_realms(db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    return db.execute(select(database.Relam).wehre(database.Realm)).scalars().all()

@app.get("/realms/mine")
def get_realms(db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    members = db.execute(select(database.RMembers).where(database.RMembers.username == username)).scalars().all()
    details = []
    for member in members:
        realm = db.get(database.Realm, member.realm_id)
        if not realm:
            continue
        detail = database.RealmDetails.model_validate(realm)
        detail.role = member.role
        detail.groups = db.execute(select(func.count()).select_from(database.Group).where(database.Group.realm_id == realm.id)).scalar_one()
        detail.members = db.execute(select(func.count()).select_from(database.RMembers).where(database.RMembers.realm_id == realm.id)).scalar_one()
        details.append(detail)
    return details

@app.post("/realms/{id}/join")
def join_realm(id: str, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    realm = db.execute(select(database.Realm).where(database.Realm.id == id)).scalar_one_or_none()
    if not realm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Realm not found"}])
    if realm.inviteType != "all":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "You need an invite to join this realm"}])
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=[{"msg": "You are already a member of this realm"}])
    db.add(database.RMembers(realm_id = id, role = "member", username = username))
    db.commit()
    return {"msg": "Sucess"}

@app.post("/realms/{id}/channel/{group}/join")
def join_group(id: str, group: str, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    grp = db.execute(select(database.Group).where((database.Group.realm_id == id) & (database.Group.id == group))).scalar_one_or_none()
    if not grp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Channel not found"}])
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "You need to be a part of realm and then join its channels"}])
    if grp.inviteType != "all":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "To join this channel you need an invite first"}])
    member = db.execute(select(database.Members).where((database.Members.name == username) & (database.Members.grpId == group))).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=[{"msg": "You are already in the channel"}])
    total_mems = db.execute(select(func.count()).select_from(database.Members).where(database.Members.grpId == group)).scalar_one()
    if total_mems >= grp.maxGrpSize:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=[{"msg": "Channel has reached max members"}])
    db.add(database.Members(name = username, grpId = group, role = "member"))
    db.commit()
    return {"msg": "Success"}

@app.post("/realm")
def create_realm(data: database.RealmCreate, db: Session = Depends(get_db), payload= Depends(verify_session_token)):
    username = payload["username"]
    realm = database.Realm(
        name=data.name,
        description = data.description or "",
        owner = username,
        inviteType=data.inviteType
    )
    db.add(realm)
    db.flush()
    db.add(database.RMembers(
        realm_id = realm.id,
        username = username,
        role = "owner"
    ))
    db.commit()
    db.refresh(realm)
    return realm

@app.delete("/realms/{id}")
def del_realm(id: str, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    realm = db.execute(select(database.Realm).where(database.Realm.id == id)).scalar_one_or_none()
    if not realm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "realm does not exists"}])
    mem = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    if not mem or mem.role != "owner":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "You are not allowed to delete this realm"}])
    groups = select(database.Group).where(database.Group.realmId == id)
    db.execute(delete(database.grpMsgsT).where(database.grpMsgsT.grpId.in_(groups)))
    db.execute(delete(database.grpsMsgsV).where(database.grpsMsgsV.grpId.in_(groups)))
    db.execute(delete(database.Members).where(database.RMembers.realm_id == id))
    db.execute(delete(database.Group).where(database.Group.realm_id == id))
    db.execute(delete(database.Invite).where(database.Invite.realm_id == id))
    db.execute(delete(database.Realm).where(database.Realm.id == id))
    db.commit()
    return {"msg": "Success"}

@app.get("/realms/{id}")
def get_realm(id: str, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    realm = db.execute(select(database.Realm).where(database.Realm.id == id)).scalar_one_or_none()
    if not realm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Realm not found"}])
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "You are not a member of this realm"}])
    details = database.RealmDetails.model_validate(realm)
    details.role = member.role
    details.groups = db.execute(select(func.count()).select_from(database.Group).where(database.Group.realm_id == id)).scalar_one()
    details.members = db.execute(select(func.count()).select_from(database.RMembers).where(database.RMembers.realm_id == id)).scalar_one()
    return details

@app.get("/realms/{id}/members")
def realm_members(id: str, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "You are not a member of this realm"}])
    return db.execute(select(database.RMembers).where(database.RMembers.realm_id == id)).scalars().all()

@app.get("/realms/{id}/groups")
def get_groups(id: str, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    realm = db.execute(select(database.Realm).where(database.Realm.id == id)).scalar_one_or_none()
    if not realm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Realm does not exists"}])
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "You are not member of this realm"}])
    channels = select(database.Members.grpId).where(database.Members.name == username)
    channels_details = db.execute(select(database.Group).where((database.Group.realm_id == id) & ((database.Group.id.in_(channels)) | (database.Group.inviteType == "all")))).scalars().all()
    return channels_details

@app.get("/groups")
def return_groups(db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    try:
        groups = db.execute(select(database.Group)).scalars().all()
        return groups
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Could not Fetch groups"}])
    
@app.get("/groups/all/{username}")
def return_groups(username : str, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    try:
        tempGrps = select(database.Members.grpName).where(database.Members.name == username)
        groups = db.execute(select(database.Group).where(database.Group.name.in_(tempGrps))).scalars().all()
        return groups
    except Exception as e:
        print(e)
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
    if grpData.minDuration >= grpData.maxDuration:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail=[{"msg": "min duration must be less than max duration"}])
    try:
        already_exists = db.execute(select(database.Group.name, database.Group.owner).where((database.Group.name == grpData.name) | (database.Group.owner == username ))).mappings().one_or_none()
        if already_exists:
            if already_exists.name == grpData.name:
                raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail=[{"msg" : "A realm with this name already exists."}])
            else:
                raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail=[{"msg" : f"You already own one realm {already_exists.name}"}])
        db_data = database.Group(
            name = grpData.name,
            description = grpData.description,
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
        member_data = database.Members(
            name = grpData.owner,
            grpName = grpData.name,
            role = "owner"
        )
        db.add(member_data)
        db.commit()
        return {"msg" : "Success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Group Not Added"}])
    
@app.delete("/delete/{groupname}")
def del_group(groupname : str, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    owner = db.execute(select(database.Members).where((database.Members.grpName == groupname) & (database.Members.name == username) & (database.Members.role == "admin"))).scalar_one_or_none()
    if not owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg": "You are not allowed to delete the group"}])
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

    
@app.post("/realm/{id}/groups/{group}/members/remove")
def remove_mem(id: str, group: str, data: database.RemoveMember, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload["username"]
    grp = db.execute(select(database.Group).where((database.Group.relam_id == id) & (database.Group.id == group))).scalar_one_or_none()
    if not grp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Channel not found"}])
    member = db.execute(select(database.RMembers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    grp_member = db.execute(select(database.Members).where((database.Members.name == username) & (database.Members.grpId == group))).scalar_one_or_none()
    if not (member and (member.role == "admin" or member.role == "owner")) and not (grp_member and (grp_member.role == "admin" or grp_member.role == "owner")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "You are not allowed to remove members"}])
    user_del = db.execute(select(database.Members).where((database.Members.grpId == group) & (database.Members.name == data.username))).scalar_one_or_none()
    if not user_del:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg" : "User not found"}])
    try:
        db.execute(delete(database.Members).where((database.Members.name == data.username) & (database.Members.grpId == group)))
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
    

@app.patch("/realms/{id}/groups/{group}")
def update_group(id: str, group: str, data: database.GrpUpdate, db: Session = Depends(get_db), payload = Depends(verify_session_token)):
    username = payload[username]
    grp = db.execute(select(database.Group).where((database.Group.realm_id == id) & (database.Group.id == group))).scalar_one_or_none()
    if not grp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg": "Channel does not exists"}])
    grp_member = db.execute(select(database.Members).where((database.Members.grpId == group) & (database.Members.name == username))).scalar_one_or_none()
    member = db.execute(select(database.RMmebers).where((database.RMembers.realm_id == id) & (database.RMembers.username == username))).scalar_one_or_none()
    if not (member and (member.role == "admin" or member.role == "owner") ) or not (grp_member and (grp_member.role == "admin" or grp_member.role == "owner")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg": "You are not allowed to update channel details, only owner and admin can do that"}])
    updates = {key: val for key, val in data.model_dump(exclude_unset=True).items() if val is not None}
    if len(updates) == 0:
        return {"msg": "Success", "details": "No changes"}
    try:
        db.execute(update(database.Group).where(database.Group.name == group).values(**updates))
        db.commit()
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg": "Could not update channel"}])
    return {"msg": "Success", "details": "Realm updated"}

class ConnectionManager:
    def __init__(self):
        self.connections : dict[tuple[str, str], WebSocket] = {}
    def add_connection(self, websocket : WebSocket, username : str, grpName : str):
        self.connections[(username, grpName)] = websocket
    def disconnect(self, username : str, grpName : str):
      if (username, grpName) in self.connections:
        del self.connections[(username, grpName)]
    async def send_message(self, message : database.Msg_return, grpName : str):
        for user in self.connections:
            if user[1] == grpName:
                await self.connections[user].send_text(message)

manager = ConnectionManager()
async def on_txt_event(data):
    await manager.send_message(data["payload"], data["group"])

manager_text = ws_manger.RedisWs(grp="groups:text", on_event=on_txt_event)

async def mark_online(manager: ws_manger.RedisWs, key: str, username: str, online: bool):
    if manager.redis is None:
        return
    try:
        if online:
            await manager.redis.sadd(key, username)
        else:
            await manager.redis.srem(key, username)
    except:
        pass

# async def websoc(user : WebSocket, db : Session = Depends(get_db)):
@app.websocket("/ws/{group}")
async def websoc(group : str, user : WebSocket, db : Session = Depends(get_db), payload = Depends(verify_session_token)):
    MAX_TIME = payload["exp"]
    username = payload["username"]
    senderName = username
    await user.accept()
    manager.add_connection(user, username, group)
    await mark_online(manager_text, f"groups:text:online:{group}", username, True)
    try:
        while True:
            
            try:
                data = await asyncio.wait_for(user.receive_json(), timeout=30)
            except asyncio.TimeoutError:
                try:
                    await user.send_json({"type": "ping"})
                    data = await asyncio.wait_for(user.receive_json(), timeout=30)
                except:
                    break

                if data.get("type") == "pong":
                    continue
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
                await manager_text.publish({"payload": temp, "group": group})
            except WebSocketDisconnect:
                break
            except Exception as e:
                try:
                    await user.send_text("An error occured")
                except:
                    pass
    finally:
        if username in manager.connections:
            manager.disconnect(username, group)
        mark_online(manager_text, f"groups:text:online:{group}", username, False)

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
async def total_active(group : str, payload = Depends(verify_session_token)):
    if manager_text.redis is not None:
        try:
            count = await manager_text.redis.scard(f"groups:text:online:{group}")
            return {"msg": "Sucess","total": count}
        except:
            pass
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
    def add_connection(self, websocket : WebSocket, username : str, grpName : str):
        self.connections[(username, grpName)] = websocket
    def disconnect(self, username : str, grpName : str):
      if (username, grpName) in self.connections:
        del self.connections[(username, grpName)]
    async def send_message(self, message, grpName : str):
        for user in self.connections:
            if user[1] == grpName:
                await self.connections[user].send_text(message)

managerV = Connection_ManagerVoice()

async def on_voice_event(data: dict):
    await managerV.send_message(base64.b64decode(data["payload_b64"]), data["group"])

manager_voice = ws_manger.RedisWs(grp="groups:voice", on_event=on_voice_event)


@app.websocket("/voice/ws/{group}")
async def voice_conn(group : str, user: WebSocket, payload = Depends(verify_session_token), db : Session = Depends(get_db)):
    username = payload["username"]
    await user.accept()
    managerV.add_connection(user, username, group)
    await mark_online(manager_voice, f"groups:voice:online:{group}", username, True)
    senderName = username
    try:
        expiry_seconds = 0
        while True:
            try:
                data = await asyncio.wait_for(user.receive(), timeout=30)
            except asyncio.TimeoutError:
                try:
                    await user.send_json({"type": "ping"})
                    data = await asyncio.wait_for(user.receive(), 30)
                except:
                    break
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
                        await manager_voice.publish({"payload_b64": base64.b64encode(complete_payload).decode("ascii"), "group": group})
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
        pass
    except Exception as e:
                    try:
                        await user.send_text("An error occured")
                    except:
                         pass
    finally:
         managerV.disconnect(username, group)
         await mark_online(manager_voice, f"groups:voice:online:{group}", username, False)

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


@app.get("/voice/{group}/livecount")
async def total_active(group : str, payload = Depends(verify_session_token)):
    if manager_voice is not None:
        try:
            count = await manager_voice.redis.scard(f"groups:voice:online:{group}")
            return {"msg": "Success", "total": count}
        except:
            pass
    count = 0
    for user in managerV.connections:
        if user[1] == group:
            count += 1
    return {
        "msg" : "Success",
        "total": count
    }