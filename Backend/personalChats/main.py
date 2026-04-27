from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import database
from sqlalchemy.orm import Session
from sqlalchemy import select, case
app = FastAPI()

origins = [
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_headers=["*"],
    allow_methods=["*"],
    allow_credentials= True
)
database.Base.metadata.create_all(bind=database.engine)
def get_db():
    with database.session() as db:
        yield db

@app.get("/personalmsgs/{user}")
def personalMsgs(user : str, db : Session = Depends(get_db)):
    msgs = []
    try:
        default_sent = db.execute(select(database.PersonalMsgs).where(
            ((database.PersonalMsgs.sender == user) | (database.PersonalMsgs.receiver == user))
            & (database.PersonalMsgs.defaultExpiration > database.PersonalMsgs.sentTime)
            )).scalars.all()
        others_sent = db.execute(select(database.PersonalMsgs).where(((database.PersonalMsgs.sender == user) | (database.PersonalMsgs.receiver == user)) & (database.PersonalMsgs.defaultExpiration == None))).scalars.all()
        msgs = default_sent + others_sent
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Messages could not be fetched"}])
    return msgs

# @app.get("/livecount/{user}")

