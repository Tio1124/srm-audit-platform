"""
routers/auth.py — Authentication & Authorization
JWT = JSON Web Token: sistem login tanpa menyimpan session di server
RBAC = Role-Based Access Control: hak akses berdasarkan peran
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv

from database import get_db, User
from schemas import UserCreate, UserResponse, Token, LoginRequest

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ── Konfigurasi JWT ──────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-change-this")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))

# ── Password hashing ─────────────────────────────────
# bcrypt = algoritma hashing password yang aman (tidak bisa di-reverse)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme untuk mengambil token dari header Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    """Mengubah password plain text menjadi hash yang aman"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Memverifikasi password plain text dengan hash yang tersimpan"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Membuat JWT token.
    Token berisi: user_id, username, role, dan waktu kadaluarsa.
    Token di-sign dengan SECRET_KEY sehingga tidak bisa dipalsukan.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    Dependency: Mendapatkan user yang sedang login dari JWT token.
    Digunakan di semua endpoint yang memerlukan autentikasi.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau sudah kadaluarsa",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_role(*roles: str):
    """
    Dependency factory untuk membatasi akses berdasarkan role.
    Contoh penggunaan: Depends(require_role("admin", "auditor"))
    """
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Akses ditolak. Hanya {', '.join(roles)} yang diizinkan."
            )
        return current_user
    return role_checker


# ── ENDPOINTS ────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Registrasi pengguna baru.
    Pengguna pertama otomatis menjadi admin.
    """
    # Cek apakah username sudah dipakai
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username sudah digunakan")

    # Cek apakah email sudah dipakai
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email sudah digunakan")

    # Pengguna pertama otomatis admin
    is_first_user = db.query(User).count() == 0
    role = "admin" if is_first_user else user_data.role.value

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Login dan dapatkan JWT token.
    Token ini harus disertakan di setiap request API selanjutnya.
    """
    user = db.query(User).filter(User.username == login_data.username).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah"
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Akun tidak aktif")

    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Mendapatkan profil pengguna yang sedang login"""
    return current_user


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Daftar semua pengguna — hanya admin"""
    return db.query(User).all()
