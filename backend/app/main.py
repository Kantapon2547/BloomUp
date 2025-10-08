from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .db import Base, engine
from .routers import auth, users, habits # <-- ADD 'habits' HERE
import os

app = FastAPI(title="BloomUp API")

# create tables (this will now create 'habits' and 'habit_logs' too)
Base.metadata.create_all(bind=engine)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-User-Email", "X-User-ID", "Authorization"],
    expose_headers=["*"],
)

# serve uploaded files
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def root():
    return {"status": "ok"}

# include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(habits.router) # <-- ADD THE NEW HABITS ROUTER