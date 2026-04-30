from sqlalchemy import create_engine, Column, Integer, String, DateTime, LargeBinary
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv

load_dotenv()
DB_URL1 = os.getenv("TEXT_DB_URL")
engine1 = create_engine(DB_URL1)
Base1 = declarative_base()
session_text = sessionmaker(bind=engine1)

DB_URL2 = os.getenv("VOICE_DB_URL")
engine2 = create_engine(DB_URL2)
Base2 = declarative_base()
session_voice = sessionmaker(bind=engine2)

DB_URL3 = os.getenv("PERSONAL_DB_URL")
engine3 = create_engine(DB_URL3)
Base3 = declarative_base()
session_personalchat = sessionmaker(bind=engine3)

class BaseMsg:
    @staticmethod
    def get_expiry(seconds : int):
        return datetime.now(timezone.utc) + timedelta(seconds=seconds)
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String)
    time_sent = Column(DateTime(timezone=True))
    expiry = Column(DateTime(timezone=True))

class Msgs(BaseMsg, Base1):
    __tablename__ = "msgs"
    msg = Column(String)

class VoiceMsgs(BaseMsg, Base2):
    __tablename__ = "voices"
    msg = Column(LargeBinary)

class PersonalMsgs(Base3):
    __tablename__ = "msgs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    sender = Column(String)
    receiver = Column(String)
    msg = Column(String)
    sentTime = Column(DateTime(timezone=True))
    duration = Column(Integer)
    defaultExpiration = Column(DateTime(timezone=True), nullable=True)
    @staticmethod
    def setDefaultExpiry(self):
        return self.sentTime + datetime.timedelta(seconds=self.duration)
    
class GroupInvite(Base3):
    __tablename__ = "grpinvites"
    id = Column(Integer, primary_key=True, autoincrement=True)
    sender = Column(String)
    receiver = Column(String)
    group = Column(String)
    sentTime = Column(DateTime(timezone=True))
    duration = Column(Integer)
    defaultExpiration = Column(DateTime(timezone=True), nullable=True)
    @staticmethod
    def setDefaultExpiry(self):
        return self.sentTime + datetime.timedelta(seconds=self.duration)