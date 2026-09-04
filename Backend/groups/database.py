from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine, Column, String, Integer, Boolean, LargeBinary, DateTime, ForeignKey
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import secrets
from typing import Optional

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

engine = create_engine(DB_URL)
Base = declarative_base()
session = sessionmaker(bind=engine)

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True)
    owner = Column(String)
    liveCount = Column(Boolean, default=True)
    anyonymity = Column(Boolean, default=False)
    maxGrpSize = Column(Integer)
    maxDuration = Column(Integer)
    minDuration = Column(Integer)
    grpType = Column(String)
    inviteType = Column(String)
    description = Column(String, nullable=True, default="")

class Members(Base):
    __tablename__ = "members"
    name = Column(String, primary_key=True)
    grpName = Column(String, ForeignKey("groups.name"), primary_key=True)
    role = Column(String, default="member")
    joinedAt = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))

class MemberData(BaseModel):
    name : str
    grpName : str

class grpMsgBase:
    @staticmethod
    def get_expiry(seconds : int):
        return datetime.now(timezone.utc) + timedelta(seconds=seconds)
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String)
    time_sent = Column(DateTime(timezone=True))
    expiry = Column(DateTime(timezone=True))
    grpName = Column(String, ForeignKey("groups.name"))

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