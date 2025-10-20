from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .db import Base, engine
from .routers import auth, users, habits, gratitude, mood, achievements
import os

app = FastAPI(title="BloomUp API")

Base.metadata.create_all(bind=engine)

# CORS - MUST be before other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-User-Email",
        "X-User-ID",
        "Accept",
        "Origin",
    ],
    expose_headers=["*"],
    max_age=600,
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
app.include_router(habits.router) 
app.include_router(gratitude.router)
app.include_router(mood.router)
app.include_router(achievements.router)