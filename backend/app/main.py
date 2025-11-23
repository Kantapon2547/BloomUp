import os
from contextlib import asynccontextmanager
from zoneinfo import ZoneInfo

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import Base, engine
from .routers import achievements, auth, gratitude, habits, mood, users
from .seed_achievements import seed_achievements

# Set Bangkok timezone
os.environ['TZ'] = 'Asia/Bangkok'

# Startup event
async def startup_event():
    print("Starting BloomUp API")
    print("Timezone: Asia/Bangkok (UTC+7)")
    seed_achievements()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await startup_event()
    yield
    # Shutdown
    pass


app = FastAPI(title="BloomUp API", lifespan=lifespan)

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
    from datetime import datetime
    from zoneinfo import ZoneInfo
    bangkok_tz = ZoneInfo("Asia/Bangkok")
    bangkok_time = datetime.now(bangkok_tz)
    return {
        "status": "ok",
        "timezone": "Asia/Bangkok (UTC+7)",
        "server_time": bangkok_time.isoformat()
    }


# include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(habits.router)
app.include_router(gratitude.router)
app.include_router(mood.router)
app.include_router(achievements.router)
