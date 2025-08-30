from pydantic import BaseModel, Field
from typing import Optional, List

class BotMiniOut(BaseModel):
    id: int
    name: str
    active: bool
    strategy_id: int

class DeleteApiIn(BaseModel):
    id: int = Field(..., gt=0)
    cascade: bool = False

class DeleteApiOut(BaseModel):
    deleted_bots: List[int] = []
    default_reassigned_to: Optional[int] = None

class APIKeyCreate(BaseModel):
    exchange: str
    api_name: str

    # HMAC
    api_key: Optional[str] = None
    api_secret: Optional[str] = None

    # ED
    ed_public: Optional[str] = None
    ed_public_pem: Optional[str] = None
    ed_private_pem: Optional[str] = None

    # Balances
    spot_balance: Optional[float] = Field(default=0)
    futures_balance: Optional[float] = Field(default=0)

class APIKeyOut(BaseModel):
    id: int