from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from database import session, engine, Base
import database
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()

origins = [
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
    allow_origins=origins
)

Base.metadata.create_all(bind = engine)
def get_db():
    with session() as db:
        yield db


@app.post("/addgroup")
def add_group(grpData : database.grpAdd, db : Session = Depends(get_db)):
    try:
        already_exists = db.execute(select(database.Group).where(database.Group.name == database.grpAdd.name)).scalar_one_or_none()
        if already_exists:
            raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail=[{"msg" : "A group with this name already exists."}])
        db_data = database.Group(
            name = grpData.name,
            liveCount = grpData.liveCount,
            anonymity = grpData.anonymity,
            maxGrpSize = grpData.maxGrpSize,
            maxDuration = grpData.maxDuration,
            minDuration = grpData.minDuration,
            guestsAllowed = grpData.guestsAllowed,
            grpType = grpData.grpType,
            inviteType = grpData.inviteType
        )
        db.add(db_data)
        db.commit()
        return {"msg" : "Success"}
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Group Not Added"}])