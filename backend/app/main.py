from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine
from . import models
from .routers import items

# Create tables on startup (simple for dev; use Alembic for prod)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="BloomUp API (FastAPI + PostgreSQL)")

# Allow Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(items.router)