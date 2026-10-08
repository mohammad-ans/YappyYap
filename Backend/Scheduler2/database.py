from sqlalchemy import create_engine, Column, Integer, String, DateTime, LargeBinary, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timedelta, timezone
import secrets
import os
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DB_URL")
engine = create_engine(DB_URL)
Base = declarative_base()
session = sessionmaker(bind=engine)


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

class grpsMsgsV(Base, grpMsgBase):
    __tablename__ = "voices"
    msg = Column(LargeBinary)

    
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
