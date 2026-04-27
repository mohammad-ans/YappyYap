from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, Boolean, create_engine, DateTime
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import datetime

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
engine = create_engine(DB_URL)
Base = declarative_base()
session = sessionmaker(bind=engine)

class PersonalMsgs(Base):
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