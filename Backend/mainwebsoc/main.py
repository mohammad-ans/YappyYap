from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Cookie
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from coolname import generate_slug
import os, jwt, httpx
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
from datetime import datetime, timedelta, timezone
import asyncio
import zipfile, io
from fastapi.responses import StreamingResponse
from json import loads
from struct import pack
from subprocess import run, PIPE
from tempfile import NamedTemporaryFile
import json
from redis.asyncio import Redis

app = FastAPI()

origins = [
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins = origins,
    allow_methods = ["*"],
    allow_headers = ["*"],
    allow_credentials = True
)

redis = Redis(host="redis", port=6379)

async def verify_session_token(session_token: Annotated[str | None, Cookie()] = None):
    payload = {"username" : "NA", "type" : "admin", "exp" : 0}
    return payload

# async def verify_session_token(session_token: Annotated[str | None, Cookie()] = None):
#     if not session_token:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=[{"msg" : "No session found."}])
#     try:
#         payload = jwt.decode(session_token, PRIVATE_KEY, ALGORITHM)
#         if not payload:
#             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg": "Payload not found"}])
#         if not payload["username"]:
#             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg": "Username Not found"}])
#     except jwt.InvalidTokenError:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg": "Invalid Token"}])
#     except jwt.ExpiredSignatureError:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=[{"msg" : "Expired Token"}])
#     return payload

@app.on_event("startup")
async def start_listen():
    asyncio.create_task(listen_async)


class ConnectionManager:
    def __init__(self):
        self.connections : dict[str, WebSocket] = {}
    async def add_connection(self, websocket : WebSocket, username : str):
        await websocket.accept()
        self.connections[username] = websocket
    def disconnect(self, username : str):
      if username in self.connections:
        del self.connections[username]
    async def send_message(self, message, username):
        await self.connections[username].send_text(message)
    
manager = ConnectionManager()

async def listen_async():
    pubsub = redis.pubsub()
    await pubsub.subscribe("notifications")

    async for msg in pubsub.listen():
        try:
            if msg["type"] == "message":
                data = json.load(msg["data"])
                await manager.send_message(data["username"], data["msg"])
        except:
            pass

# async def websoc(user : WebSocket, db : Session = Depends(get_db)):
@app.websocket("/ws/global")
async def websoc(user : WebSocket, payload = Depends(verify_session_token)):
    MAX_TIME = payload["exp"]
    username = payload["username"]
    await manager.add_connection(user, username)
    try:
        while True:
            
            try:
                data = await user.receive()
                
            except WebSocketDisconnect:
                manager.disconnect(username)
                break
            except asyncio.TimeoutError:
                manager.disconnect(username)
                break
            except Exception as e:
                manager.disconnect(username)
                break
    finally:
        if username in manager.connections:
            manager.disconnect(username)

