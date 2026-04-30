from sqlalchemy import create_engine, Column, Integer, String, DateTime, LargeBinary
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
engine = create_engine(DB_URL)
Base = declarative_base()
session = sessionmaker(bind=engine)

class Home_comp(Base):
    __tablename__="homecomps"
    id = Column(Integer, primary_key=True, autoincrement=True)
    heading = Column(String)
    content = Column(String)
    img = Column(LargeBinary)

class About_comp(Base):
    __tablename__="aboutcomps"
    id = Column(Integer, primary_key=True, autoincrement=True)
    content = Column(String)