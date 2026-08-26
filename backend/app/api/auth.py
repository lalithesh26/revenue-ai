import json
import base64
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest, LoginResponse, UserResponse, UserUpdateRequest,
    RegisterRequest, GoogleAuthRequest
)
from app.services.auth import (
    verify_password,
    create_access_token,
    get_current_user,
    hash_password
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Validates user credentials and issues a signed JWT access token."""
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated. Contact support."
        )

    expires_in = 7 * 24 * 3600 if req.remember_me else 24 * 3600
    token = create_access_token(user_id=user.id, email=user.email, role=user.role, expires_in=expires_in)
    
    return {"token": token, "token_type": "bearer", "user": user}


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Creates a new user account and returns a signed JWT."""
    email_clean = req.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please sign in instead."
        )
    
    if len(req.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters long."
        )

    new_user = User(
        name=req.name.strip(),
        email=email_clean,
        password_hash=hash_password(req.password),
        role="admin",
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    expires_in = 7 * 24 * 3600 if req.remember_me else 24 * 3600
    token = create_access_token(user_id=new_user.id, email=new_user.email, role=new_user.role, expires_in=expires_in)
    return {"token": token, "token_type": "bearer", "user": new_user}


@router.post("/google", response_model=LoginResponse)
def google_signin(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Google OAuth sign-in / sign-up.
    In sandbox mode, the credential is the raw Google ID Token (JWT).
    We decode the payload without signature verification (sandbox only).
    In production, replace with google-auth-library verification.
    """
    try:
        # JWT is header.payload.signature — decode the payload part
        parts = req.credential.split(".")
        if len(parts) < 2:
            raise ValueError("Invalid token format")
        padding = 4 - (len(parts[1]) % 4)
        padded = parts[1] + ("=" * (padding % 4))
        payload = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
        google_email = payload.get("email", "").strip().lower()
        google_name = payload.get("name") or payload.get("given_name", "Google User")
        if not google_email:
            raise ValueError("No email in token payload")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google credential token. Please try again."
        )

    # Find or auto-create the user
    user = db.query(User).filter(User.email == google_email).first()
    if not user:
        import secrets as _sec
        user = User(
            name=google_name,
            email=google_email,
            password_hash=hash_password(_sec.token_urlsafe(32)),  # random unusable password
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated.")

    expires_in = 7 * 24 * 3600 if req.remember_me else 24 * 3600
    token = create_access_token(user_id=user.id, email=user.email, role=user.role, expires_in=expires_in)
    return {"token": token, "token_type": "bearer", "user": user}


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Logs out user and invalidates client session."""
    return {"message": "Successfully logged out from RevenueAI", "user_id": current_user.id}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns currently authenticated user profile."""
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    req: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates user profile settings."""
    if req.name:
        current_user.name = req.name.strip()
        db.commit()
        db.refresh(current_user)
    return current_user

@router.get("/demo-credentials")
def get_demo_info():
    """Provides development demo email hint for quick evaluation."""
    return {
        "demo_email": settings.DEMO_USER_EMAIL,
        "role": "Fintech Administrator",
        "project": "RevenueAI"
    }
