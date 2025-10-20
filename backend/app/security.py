import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import os
import logging

from . import models
from .db import get_db

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

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
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    logger.info(f"Created token for {subject}")
    return token

def decode_token(token: str) -> str:
    try:
        logger.debug(f"Attempting to decode token: {token[:20]}...")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        email = payload.get("sub")
        logger.debug(f"Token decoded successfully, email: {email}")
        return email
    except ExpiredSignatureError:
        logger.warning("Token has expired")
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Error decoding token: {e}", exc_info=True)
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def get_current_email(token: str = Depends(oauth2_scheme)) -> str:
    email = decode_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    return email

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> models.User:
    """
    Dependency function to retrieve the authenticated user from the JWT token.
    """
    try:
        logger.info("get_current_user called")
        logger.debug(f"Token received: {token[:30]}...")
        
        # Decode token
        email = decode_token(token)
        logger.debug(f"Token decoded, email: {email}")
        
        # Import here to avoid circular imports
        from . import crud
        
        # Get user from database
        user = crud.get_user_by_email(db, email=email)
        logger.debug(f"User lookup result: {user}")
        
        if user is None:
            logger.warning(f"User not found for email: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"Authenticated user: {user.user_id} ({user.email})")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    