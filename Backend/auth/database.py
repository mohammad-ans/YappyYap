from sqlalchemy import create_engine, Column, Integer, String, DateTime, LargeBinary
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timedelta, timezone
import os
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("AUTH_DATABASE_URL")
engine = create_engine(DB_URL)
Base = declarative_base()
session = sessionmaker(bind=engine)

class Users(Base):
    __tablename__ = "users"

    username = Column(String, primary_key=True, index=True)
    email = Column(String, index=True)

class Pending_users(Base):
    __tablename__ = "pending_users"

    username = Column(String, primary_key=True, index=True)
    email = Column(String, index=True)


class OTP_entry(Base):
    __tablename__ = "otps"

    @staticmethod
    def get_expiry_time():
        return datetime.now(timezone.utc) + timedelta(minutes=4)
    @staticmethod
    def get_current_time():
        return datetime.now(timezone.utc)
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, primary_key=True)
    email = Column(String, index=True)
    otp = Column(String)
    creation_time = Column(DateTime(timezone=True), default=get_current_time)
    expiry_time = Column(DateTime(timezone=True), default=get_expiry_time)

class Guests(Base):
    __tablename__ = "guests"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, index=True)

class Admins(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String)
    email = Column(String)

class Email_signin(BaseModel):
    email: EmailStr

class Email_signup(Email_signin):
    username:str

class OTP_verification(Email_signin):
    otp : str

class Guest_login(BaseModel):
    username: str