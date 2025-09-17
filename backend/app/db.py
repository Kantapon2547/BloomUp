import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# database
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DB_USER = os.getenv("DATABASE_USER", os.getenv("POSTGRES_USER"))
    DB_PW   = os.getenv("DATABASE_PASSWORD", os.getenv("POSTGRES_PASSWORD"))
    DB_HOST = os.getenv("DATABASE_HOST", "db")
    DB_PORT = os.getenv("DATABASE_PORT", "5432")
    DB_NAME = os.getenv("DATABASE_NAME", os.getenv("POSTGRES_DB"))
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PW}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
