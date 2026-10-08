from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine, Column, String, Integer, Boolean, LargeBinary, DateTime, ForeignKey
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
import os, uuid, secrets
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

engine = create_engine(DB_URL)
Base = declarative_base()
session = sessionmaker(bind=engine)

class Realm(Base):
    __tablename__ = "realms"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    description = Column(String, nullable=True, default="")
    owner = Column(String, index=True)
    inviteType = Column(String)
    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class RMembers(Base):
    __tablename__ = "realm_members"
    realm_id = Column(String, ForeignKey("realms.id"), primary_key=True)
    username = Column(String, primary_key=True)
    role = Column(String, default="member")
    joinedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Group(Base):
    __tablename__ = "groups"
    realm_id = Column(String , ForeignKey("realms.id")) 
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    owner = Column(String)
    liveCount = Column(Boolean, default=True)
    anyonymity = Column(Boolean, default=False)
    maxGrpSize = Column(Integer)
    maxDuration = Column(Integer)
    minDuration = Column(Integer)
    grpType = Column(String)
    inviteType = Column(String)
    description = Column(String, nullable=True, default="")
    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class GroupDetails(BaseModel):
    id: str
    realm_id: str
    name: str
    description: Optional[str] = ""
    owner: str
    createdAt: datetime
    liveCount: bool
    anyonymity: bool
    maxGrpSize: int
    maxDuration: int
    minDuration: int
    grpType: str
    inviteType: str
    role: Optional[str] = None
    memberCount: int = 0
    model_config = {"from_attributes": True}

class Members(Base):
    __tablename__ = "members"
    name = Column(String, primary_key=True)
    grpId = Column(String, ForeignKey("groups.id"), primary_key=True)
    role = Column(String, default="member")
    joinedAt = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))

class Invite(Base):
    __tablename__ = "invites"
    token = Column(String, primary_key=True, default=lambda: secrets.token_urlsafe(16))
    scope = Column(String)
    realm_id = Column(String, ForeignKey("realms.id"))
    grpId = Column(String, ForeignKey("groups.id"), nullable=True)
    invitedBy = Column(String)
    username = Column(String)
    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expiresAt = Column(DateTime(timezone=True), nullable=True)
    used = Column(Boolean, default=False)
    usedAt = Column(DateTime(timezone=True), nullable=True)
    canceled = Column(Boolean, default=False)

class grpMsgBase:
    @staticmethod
    def get_expiry(seconds : int):
        return datetime.now(timezone.utc) + timedelta(seconds=seconds)
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String)
    time_sent = Column(DateTime(timezone=True))
    expiry = Column(DateTime(timezone=True))
    grpId = Column(String, ForeignKey("groups.id"))

class grpMsgsT(Base, grpMsgBase):
    __tablename__ = "texts"
    msg = Column(String)

class Msg_return(BaseModel):
    msg : str
    username : str
    time_sent : datetime | str
    expiry : datetime | str
    model_config = {
        "from_attributes" : True
    }

class grpsMsgsV(Base, grpMsgBase):
    __tablename__ = "voices"
    msg = Column(LargeBinary)

class GrpAdd(BaseModel):
    name : str
    description: Optional[str]
    owner : str
    liveCount : bool = True
    anonymity : bool = False
    maxGrpSize : int
    maxDuration : int
    minDuration : int
    grpType : str
    inviteType : str

class GrpUpdate(BaseModel):
    description: Optional[str] = None
    liveCount: Optional[bool] = None
    anonymity: Optional[bool] = None
    maxGrpSize: Optional[int] = None
    maxDuration: Optional[int] = None
    minDuration: Optional[int] = None
    grpType: Optional[str] = None
    inviteType: Optional[str] = None

class RealmUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    inviteType: Optional[str] = None

class RealmCreate(BaseModel):
    name: str
    description: Optional[str]
    inviteType: str

class RealmDetails(BaseModel):
    id: str
    name: str
    owner: str
    createdAt: datetime
    inviteType: str
    role: str
    description: str
    members: int = 0
    groups: int = 0
    model_config = {"from_attributes": True}

class RemoveMember(BaseModel):
    username: str

class MemberUpdate(BaseModel):
    name: str
    role: str

class InviteCreate(BaseModel):
    username: str
    expiresInHours: Optional[int] = Field(default=48, ge=1, le=24 * 15)

class Username(BaseModel):
    username: str

class InvitePreview(BaseModel):
    scope: str
    realm_name: str
    name: str | None
    valid: bool
    reason: str | None
    valid_user: bool
    invitedBy: str