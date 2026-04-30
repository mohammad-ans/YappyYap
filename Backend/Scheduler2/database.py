from sqlalchemy import create_engine, Column, Integer, String, DateTime, LargeBinary, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timedelta, timezone
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
    grpName = Column(String, ForeignKey("groups.name"))

class grpMsgsT(Base, grpMsgBase):
    __tablename__ = "texts"
    msg = Column(String)

class grpsMsgsV(Base, grpMsgBase):
    __tablename__ = "voices"
    msg = Column(LargeBinary)