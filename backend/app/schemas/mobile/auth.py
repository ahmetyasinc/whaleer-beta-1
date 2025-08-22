# app/schemas/auth_mobile.py
from pydantic import BaseModel, Field
from typing import Optional

class MobileLoginRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=3)
    # opsiyonel: cihaz bilgisi, push token vs. eklemek istersen:
    device_id: Optional[str] = None
    device_name: Optional[str] = None

class MobileAuthUser(BaseModel):
    id: int
    username: str
    followers: int

class MobileAuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: MobileAuthUser
