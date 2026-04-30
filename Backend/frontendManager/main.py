from fastapi import FastAPI, UploadFile, Request, Form, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Annotated
from database import Base, Home_comp, About_comp, session, engine
from sqlalchemy import select
from io import BytesIO
from pydantic import BaseModel
import zipfile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins=[
    "http://localhost:5173",
    "https://yappyyap.xyz"
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


Base.metadata.create_all(bind=engine)

def get_db():
    with session() as db: 
        yield db
class Criteria(BaseModel):
    heading : str

class AboutCompData(BaseModel):
    content : str

@app.post("/aboutcomps")
async def about_comps(data : AboutCompData, db : Session = Depends(get_db)):
    already_exists = db.execute(select(About_comp).where(About_comp.content == data.content)).scalar_one_or_none()
    if already_exists:
        return {
            "msg" : "Heading already exists"
        }
    dbdata = About_comp(
        content = data.content
    )
    db.add(dbdata)
    db.commit()
    return {"msg" : "Success"}

@app.get("/get/aboutcomps")
async def get_about_comps(db : Session = Depends(get_db)):
    components = db.execute(select(About_comp).where(True)).scalars().all()
    payload = []
    for comp in components:
        payload.append(comp.content)
    return {"msg" : "Success", "content" : payload}

@app.post("/delete/aboutcomps")
async def del_about_comps(data : AboutCompData, db : Session = Depends(get_db)):
    data_tuple = db.execute(select(About_comp).where(About_comp.content == data.content)).scalar_one_or_none()
    if data_tuple:
        db.delete(data_tuple)
        db.commit()
        return {"msg" : "Row deleted"}
    return {"msg" : "No row detected"}

@app.post("/homecomps")
async def home_comps(heading : Annotated[str,Form()], content : Annotated[str, Form()], file : Annotated[UploadFile, Form()], db : Session = Depends(get_db)):
    bytes_data = await file.read()
    already_exists = db.execute(select(Home_comp).where(Home_comp.heading == heading)).scalar_one_or_none()
    if already_exists:
        already_exists.content = content 
        already_exists.img = bytes_data
        db.commit()
        return {
            "msg" : "Data Updated"
        }
    data = Home_comp(
        heading = heading,
        content = content, 
        img = bytes_data
    )
    db.add(data)
    db.commit()
    return {"msg" : "Success"}

@app.post("/delete/homecomps")
async def del_home_comp(data : Criteria,db : Session = Depends(get_db)):
    data_tuple = db.execute(select(Home_comp).where(Home_comp.heading == data.heading)).scalar_one_or_none()
    if data_tuple:
        db.delete(data_tuple)
        db.commit()
        return {"msg" : "Row deleted"}
    return {"msg" : "No row detected"}

@app.get("/get/homecomps")
async def get_home_comps(db : Session = Depends(get_db)):
    data = db.execute(select(Home_comp).where(True)).scalars().all()
    zip_file = BytesIO()
    with zipfile.ZipFile(zip_file, mode="w") as zipF:
        for comp in data:
            heading = comp.heading.encode("utf-8")
            content = comp.content.encode("utf-8")
            payload = len(heading).to_bytes(4, "big") + heading + len(content).to_bytes(4, "big") + content + comp.img
            zipF.writestr(comp.heading, payload)
    zip_file.seek(0)
    return StreamingResponse(zip_file)