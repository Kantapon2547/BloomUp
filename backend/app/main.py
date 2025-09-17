from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine
from . import models
from .routers import items, auth  

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BloomUp API (FastAPI + PostgreSQL)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(items.router)
app.include_router(auth.router) 
