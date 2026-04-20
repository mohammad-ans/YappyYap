from fastapi import FastAPI, UploadFile, File, HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
# import auth, websocket, voicewebsoc, components
import os
from auth import verify_session_token
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from database import session, Contact_us, Contact_us_data, NewsLetter, BugsReport
from typing import Annotated
app = FastAPI()
# app.include_router(auth.router)
# app.include_router(voicewebsoc.router)
# app.include_router(websocket.router)
# app.include_router(components.router)

origins = [
    "https://yappyyap.xyz",
    "https://www.yappyyap.xyz"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    with session() as db:
        yield db

@app.get("/userdetails")
def user_details(payload = Depends(verify_session_token)):
    username = payload["username"]
    user_type = payload["type"]
    # raise HTTPException(status_code=404)
    return {
        "username" : username,
        "user_type" : user_type
    }

@app.post("/contactus")
def contactus(data : Contact_us_data, db : Session = Depends(get_db)):
    if data.type == "NewsLetter":
        alreadyexists = db.execute(select(NewsLetter).where(NewsLetter.email == data.content)).scalar_one_or_none()
        if alreadyexists:
            return {"msg" : "Already signed for newsletter"}
        else:
            dbdata = NewsLetter(
                email = data.content
            )
    elif data.type == "Bug":
        dbdata = BugsReport(
            bug = data.content
        )
    else:
        dbdata = Contact_us(
            type=data.type,
            content = data.content
        )
    db.add(dbdata)
    db.commit()
    return {"msg" : "Success"}

@app.get("/")
def root():
    return {"msg" : "Hi vro"}

if __name__=="__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)