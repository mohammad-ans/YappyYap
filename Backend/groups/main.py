from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
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
def add_group(grpData : database.GrpAdd, db : Session = Depends(get_db)):
    try:
        already_exists = db.execute(select(database.Group).where(database.Group.name == database.grpAdd.name)).scalar_one_or_none()
        if already_exists:
            raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail=[{"msg" : "A group with this name already exists."}])
        db_data = database.Group(
            name = grpData.name,
            owner = grpData.owner,
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
    
@app.delete("/delete/{groupname}")
def del_group(groupname : str, db : Session = Depends(get_db)):
    try:
        exists = db.execute(select(database.Group).where(database.Group.name == groupname)).scalars().one_or_none()
        if not exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=[{"msg" : "Group does not exists"}])
        db.delete(exists)
        db.commit()
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "Group could not be deleted"}])
    return {"msg" : "Success"}

@app.post("/addmem")
def add_mem(memberData : database.MemberData, db : Session = Depends(get_db)):
    try:
        member = database.Members(
            name = memberData.name,
            grpName = memberData.name
        )
        db.add(member)
        db.commit()
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "User could not be added"}])
    
@app.post("/delmem")
def del_user(memberData : database.MemberData, db : Session = Depends(get_db)):
    try:
        db.execute(delete(database.Members).where((database.Members.name == memberData.name) & (database.Members.grpName == memberData.grpName)))
        db.commit()
    except:
       raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=[{"msg" : "User could not be deleted"}])