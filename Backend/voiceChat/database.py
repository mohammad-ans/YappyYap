from sqlalchemy import create_engine, Column, Integer, String, DateTime, LargeBinary
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv

load_dotenv()
DB_URL = "postgresql://myuser:pswd@tchat-db:5432/tchatdb"
engine = create_engine(DB_URL)
Base = declarative_base()
session = sessionmaker(bind=engine)


class BaseMsg:
    @staticmethod
    def get_expiry(seconds : int):
        return datetime.now(timezone.utc) + timedelta(seconds=seconds)
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String)
    time_sent = Column(DateTime(timezone=True))
    expiry = Column(DateTime(timezone=True))

class VoiceMsgs(BaseMsg, Base):
    __tablename__ = "voices"
    msg = Column(LargeBinary)