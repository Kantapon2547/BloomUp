import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
import os

JWT_SECRET = os.getenv("JWT_SECRET", "change_me")
JWT_ALG = "HS256"
JWT_EXPIRE_MIN = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(raw: str) -> str:
    return pwd_context.hash(raw)

def verify_password(raw: str, hashed: str) -> bool:
    return pwd_context.verify(raw, hashed)

def create_access_token(subject: str) -> str:
    payload = {
        "sub": subject,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload.get("sub")
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_email(token: str = Depends(oauth2_scheme)) -> str:
    email = decode_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    return email
