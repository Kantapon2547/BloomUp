import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
import os

BCRYPT_MAX_BYTES = 72
JWT_SECRET = os.getenv("JWT_SECRET", "change_me")
JWT_ALG = "HS256"
JWT_EXPIRE_MIN = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(plain_password) -> str:
    if not isinstance(plain_password, str):
        raise TypeError(f"Password must be a str, got {type(plain_password).__name__}")

    b = plain_password.encode("utf-8")
    if len(b) > BCRYPT_MAX_BYTES:
        raise ValueError(f"Password too long ({len(b)} bytes). Max is {BCRYPT_MAX_BYTES} bytes in UTF-8.")

    return pwd_context.hash(plain_password)

def verify_password(plain_password: str, password_hash: str) -> bool:
    if not isinstance(plain_password, str):
        raise TypeError(f"Password must be a str, got {type(plain_password).__name__}")
    if not isinstance(password_hash, str):
        raise TypeError(f"password_hash must be a str, got {type(password_hash).__name__}")
    return pwd_context.verify(plain_password, password_hash)

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