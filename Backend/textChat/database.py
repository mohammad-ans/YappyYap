from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()
DB_URL = os.getenv("TCHAT_DATABASE_URL")
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

class Msgs(BaseMsg, Base):
    __tablename__ = "msgs"
    msg = Column(String)

class Msg_return(BaseModel):
    # id : int | str
    msg : str
    username : str
    time_sent : datetime | str
    expiry : datetime | str
    model_config = {
        "from_attributes" : True
    }
