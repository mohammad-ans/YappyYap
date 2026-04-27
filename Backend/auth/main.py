from database import Base, engine, session, Guest_login, Email_signin, Email_signup, OTP_entry, Users, OTP_verification, Pending_users, Guests, Admins
from fastapi import FastAPI, Depends, HTTPException, Cookie, Response, status, Request
from send_email import send_otp
import random
import jwt
import os
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timezone
import time
from coolname import generate_slug
from dotenv import load_dotenv
from typing import Annotated
from fastapi.middleware.cors import CORSMiddleware
from authlib.integrations.starlette_client import OAuth
from starlette.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
import secrets

load_dotenv()
app = FastAPI()

origins=[
    "http://localhost:5173"
]

app.add_middleware(
    SessionMiddleware,
    secret_key="123"   
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

CLIENT_ID = os.getenv("GOOGLE_CLIENT")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
oauth = OAuth()

oauth.register(
    name = "google",
    client_id = CLIENT_ID,
    client_secret = CLIENT_SECRET,
    server_metadata_url = "https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs = {"scope" : "openid email profile"} 

)

Base.metadata.create_all(bind=engine)
ALGORITHM = "HS256"
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

def get_db():
    with session() as db:
        yield db

async def create_session_token(data:dict):
    token = jwt.encode(data, PRIVATE_KEY, algorithm=ALGORITHM)
    return token

async def verify_session_token(session_token: Annotated[str | None, Cookie()] = None):
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg" : "No session found."}])
    try:
        payload = jwt.decode(session_token, PRIVATE_KEY, ALGORITHM)
        if not payload:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg": "Payload not found"}])
        if not payload["username"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg": "Username Not found"}])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg": "Invalid Token"}])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg" : "Expired Token"}])
    return payload



@app.post("/signup") 
async def signup(data : Email_signup, db : Session = Depends(get_db)):
    random_otp = str(random.randint(10, 99)) + chr(65 + random.randint(0, 26)) + str(random.randint(10, 99)) + chr(65 + random.randint(0, 26))
    already_exists = db.execute(select(Users).where(Users.email == data.email)).scalar_one_or_none()
    if already_exists:
        raise HTTPException(status_code=400, detail=[{"msg":"Account already exists"}])
    # already_exists = db.query(Users).filter_by(username=data.username).first()
    already_exists = db.execute(select(Users).where(Users.username == data.username)).scalar_one_or_none()
    if already_exists:
        raise HTTPException(status_code=400, detail=[{"msg":"User name already taken"}])
    already_exists = db.execute(select(Pending_users).where(Pending_users.email == data.email or Pending_users.username == data.username)).scalar_one_or_none()
    # already_exists = db.query(Pending_users).filter_by(email = data.email).update({"username" : data.username})
    if already_exists:
        already_exists.username = data.username
    else:
        pending_user_data = Pending_users(
            username = data.username,
            email = data.email
        )
        db.add(pending_user_data)
    try:
        email_response = await send_otp(data.email, random_otp)
    except Exception as ex:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=[{"msg" : "Service not available. Try Again."}])
    # already_exists = db.query(OTP_entry).filter_by(email = data.email).update({"otp":random_otp})
    already_exists = db.execute(select(OTP_entry).where(OTP_entry.email == data.email)).scalar_one_or_none()
    if already_exists:
        already_exists.otp = random_otp
        already_exists.expiry_time = OTP_entry.get_expiry_time()
        already_exists.creation_time = datetime.now(timezone.utc)
    else:
        data_for_dbadd = OTP_entry(
            username = data.username,
            email = data.email,
            otp = random_otp
        )
        db.add(data_for_dbadd)

    db.commit()
    return {"msg" : "Success"}

@app.post("/acc-create")
async def acc_create(verification_data : OTP_verification, response: Response, db : Session = Depends(get_db)):
    # otp_entry = db.query(OTP_entry).filter_by(email=verification_data.email, otp=verification_data.otp).first()
    otp_entry = db.execute(select(OTP_entry).where((OTP_entry.email == verification_data.email) & (OTP_entry.otp == verification_data.otp))).scalar_one_or_none()
    if not otp_entry:
        raise HTTPException(status_code=401, detail=[{"msg":"Invalid OTP"}])
    if otp_entry.expiry_time < (datetime.now(timezone.utc)):
        raise HTTPException(status_code=401, detail=[{"msg":"OTP expired"}])
    # pending_user = db.query(Pending_users).filter_by(email = verification_data.email).first()
    pending_user = db.execute(select(Pending_users).where(Pending_users.email == verification_data.email)).scalar_one()
    user = Users(
        username = pending_user.username,
        email = pending_user.email, 
    )
    db.add(user)
    db.delete(otp_entry)
    db.delete(pending_user)
    db.commit()
    token = await create_session_token({"username": user.username, "type" : "Permanent", "exp" : int(time.time()) + 1800})
    response.set_cookie(
        key="session_token",
        value=token,
        httponly = True,
        secure = True,
        samesite="none",
        max_age=1800,
        path="/",
        domain=".yappyyap.xyz"
    )
    return {"msg":"Success", "username" : user.username, "user" : "email"}



@app.post("/signin") 
async def signin(data : Email_signin, db : Session = Depends(get_db)):
    random_otp = str(random.randint(10, 99)) + chr(65 + random.randint(0, 26)) + str(random.randint(10, 99)) + chr(65 + random.randint(0, 26))
    # user = db.query(Users).filter_by(email = data.email).first()
    user = db.execute(select(Users).where(Users.email == data.email)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=[{"msg":"User Not Found"}])
    # already_exists = db.query(OTP_entry).filter_by(email = data.email).update({"otp":random_otp})
    already_exists = db.execute(select(OTP_entry).where(OTP_entry.email == data.email)).scalar_one_or_none()
    try:
        email_response = await send_otp(data.email, random_otp)
    except:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=[{"msg" : "Service not available. Try Later."}])
    if already_exists:
        already_exists.otp = random_otp
        already_exists.expiry_time=OTP_entry.get_expiry_time()
        already_exists.creation_time = datetime.now(timezone.utc)
    else:
        data_for_dbadd = OTP_entry(
            email = data.email,
            username = user.username,
            otp = random_otp
        )
        db.add(data_for_dbadd)
    db.commit()
        
    return {"msg" : "Success"}

@app.post("/acc-verify")
async def verify(verification_data : OTP_verification, response: Response, db : Session = Depends(get_db)):
    # otp_entry = db.query(OTP_entry).filter_by(email=verification_data.email, otp=verification_data.otp).first()   #.order_by(OTP_entry.creation_time.desc())
    otp_entry = db.execute(select(OTP_entry).where((OTP_entry.email == verification_data.email) & (OTP_entry.otp == verification_data.otp))).scalar_one_or_none()
    if not otp_entry:
        raise HTTPException(status_code=401, detail=[{"msg":"Invalid OTP"}])
    if otp_entry.expiry_time < (datetime.now(timezone.utc)):
        raise HTTPException(status_code=401, detail=[{"msg":"OTP expired"}])
    
    # user = db.query(Users).filter_by(email = verification_data.email).first()
    user = db.execute(select(Users).where(Users.email == verification_data.email)).scalar_one()
    payload = {"username" : user.username, "type" : "Permanent", "exp" : int(time.time()) + 1800}
    # admin_check = db.query(Admins).filter(email=verification_data.email).first()
    admin_check = db.execute(select(Admins).where(Admins.email == verification_data.email)).scalar_one_or_none()
    if admin_check:
        payload = {"username" : user.username, "type" : "admin", "exp" : int(time.time()) + 1800}
    token = await create_session_token(payload)
    response.set_cookie(
        key="session_token",
        value = token,
        httponly = True,
        secure = True,
        samesite = "none",
        max_age=1800,
        path="/",
        domain=".yappyyap.xyz"
        )
    db.delete(otp_entry)
    db.commit()
    return {"msg":"Success", "username" : user.username}



@app.get("/logincheck")
async def logincheck(message = Depends(verify_session_token)):
    username = message["username"]
    return {
        "msg" : "Success",
        "username" : username
    }

@app.get("/userCheck/{user}")
async def userCheck(user : str, db : Session = Depends(get_db)):
    try:
        already_exists = db.execute(select(Users).where(Users.username == user)).scalar_one_or_none()
        if already_exists:
            return {"msg" : True}
        else:
            return {"msg" : False}
                
    except:
        return {"msg" : True}
# @app.get("/logincheck")
# async def logincheck():
#     username = "ans"
#     return {
#         "msg" : "Success",
#         "username" : username
#     }
    
@app.get("/guestlogin")
async def guest_login(response: Response, db : Session = Depends(get_db)):
    username = generate_slug(2)
    # already_exists = db.query(Users).filter(username = request.username).first()
    # already_exists = db.query(Guests).filter(username = request.username).first()
    while True:
        already_exists_user = db.execute(select(Users).where(Users.username == username)).scalar_one_or_none()
        already_exists_guest = db.execute(select(Guests).where(Guests.username == username)).scalar_one_or_none()
        if not already_exists_user and not already_exists_guest:
            break
        username = generate_slug(2)

    guest_data = Guests(
        username = username
    )
    db.add(guest_data)
    db.commit()
    token = await create_session_token({"username" : guest_data.username, "type": "Guest", "exp": int(time.time()) + 600})
    response.set_cookie(
        key="session_token",
        value = token,
        httponly = True,
        secure = True,
        samesite="none",
        max_age=300,
        path="/",
        domain=".yappyyap.xyz"
    )
    return {"msg" : "Success", "username" : username}
    
@app.get("/signout")
async def signout(response: Response):
    response.delete_cookie(key="session_token")
    return {"msg" : "Success"}

@app.post("/delete")
async def delete_acc(request: Email_signin, response: Response, db: Session = Depends(get_db), msg = Depends(verify_session_token)):
    response.delete_cookie(key="session_token")
    # del_user = db.query(Users).filter(email=request.email).first()
    del_user = db.execute(select(Users).where(Users.email == request.email)).scalar_one()
    db.delete(del_user)
    db.commit()
    return {"msg" : "Success"}

@app.post("/signoutguest")
async def guest_logout(request: Guest_login, response : Response, db : Session= Depends(get_db), msg = Depends(verify_session_token)):
    response.delete_cookie(key="session_token")
    # del_user_signout = db.query(Guests).filter(username = request.username).first()
    del_user_signout = db.execute(select(Guests).where(Guests.username == request.username)).scalar_one()
    db.delete(del_user_signout)
    db.commit()
    return {"msg" : "Success"}

@app.get("/admincheck")
async def adminAuthentication(payload = Depends(verify_session_token)):
    if (not payload["type"]) or (payload["type"] != "admin"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg" : "Not an admin"}])
    return {"msg" : "Success"}

@app.get("/auth/g")
async def google_login(request : Request):
    try:
        redirect_url = request.url_for("auth_callback")
        return await oauth.google.authorize_redirect(request, redirect_url)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=[{"msg" : "Could not verify identity"}])

@app.get("/auth/google")
async def auth_callback(request : Request, db : Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)

        user = token.get("userinfo")
        email = user["email"]
        username = db.execute(select(Users.username).where(Users.email == email)).mappings().one_or_none()
        if not username:
            token = await create_session_token({"temp" : "token", "exp" : int(time.time()) + 1800})
            response = RedirectResponse(url=f"http://localhost:5173/signup?email={email}")
            response.set_cookie(
                key="temp_token",
                value=token,
                httponly=True,
                secure=True,
                samesite="none",
                max_age=1800,
                path="/",
                domain=".yappyyap.xyz"
            )
            return response
        
        response = RedirectResponse(url=f"http://localhost:5173/chat")
        username = username["username"]

        token = await create_session_token({"username" : username, "type": "a", "exp": int(time.time()) + 1800})
        response.set_cookie(
        key="session_token",
        value = token,
        httponly = True,
        secure = True,
        samesite="none",
        max_age=1800,
        path="/",
        domain=".yappyyap.xyz"
        )
        print(user)
        return response
    except Exception as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=[{"msg" : "Could not verify identity"}])
    
@app.post("/add/google")
def add_user_google(username : str, temp_token : Annotated[str | None, Cookie()] = None):
    pass