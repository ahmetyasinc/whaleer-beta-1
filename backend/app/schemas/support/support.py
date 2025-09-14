# app/schemas/profile/support/support.py
from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import datetime
from typing import Optional, List
from enum import Enum

# Enumlar
class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class TicketPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class AssignedModerator(BaseModel):
    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CategoryBrief(BaseModel):
    id: int
    name: str
    is_active: Optional[bool] = None   # tablonuzda varsa
    model_config = ConfigDict(from_attributes=True)

class SupportTicketOut(BaseModel):
    id: int
    user_id: int
    category_id: Optional[int]
    subject: str
    status: str
    priority: str
    satisfaction_rating: Optional[int]
    satisfaction_feedback: Optional[str]
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime]

    assigned_moderator: Optional[AssignedModerator] = None
    category: Optional[CategoryBrief] = None   # ← YENİ (nested kategori)

    model_config = ConfigDict(from_attributes=True)

    
# Kategori Şemaları
class SupportCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: bool = True

class SupportCategoryCreate(SupportCategoryBase):
    pass

class SupportCategoryOut(SupportCategoryBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Attachment Şemaları
class SupportAttachmentOut(BaseModel):
    id: int
    ticket_id: Optional[int]
    message_id: Optional[int]
    user_id: int
    filename: str
    storage_path: str
    mime_type: str
    size_bytes: int
    width: Optional[int]
    height: Optional[int]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SupportAttachmentUpload(BaseModel):
    ticket_id: Optional[int] = None
    message_id: Optional[int] = None

# Ticket Şemaları
class SupportTicketBase(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    category_id: Optional[int] = None
    priority: TicketPriority = TicketPriority.NORMAL

class SupportTicketCreate(SupportTicketBase):
    message: str = Field(..., min_length=1)

class SupportTicketUpdate(BaseModel):
    subject: Optional[str] = Field(None, min_length=1, max_length=200)
    category_id: Optional[int] = None
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None

class SupportTicketSatisfaction(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None

# Mesaj Şemaları
class SupportMessageBase(BaseModel):
    message: str = Field(..., min_length=1)
    is_internal: bool = False

class SupportMessageCreate(SupportMessageBase):
    pass

class SupportMessageOut(BaseModel):
    id: int
    ticket_id: int
    user_id: int
    message: str
    is_internal: bool
    created_at: datetime
    read_at: Optional[datetime]
    attachments: List[SupportAttachmentOut] = []  # Mesaj ekleri
    
    model_config = ConfigDict(from_attributes=True)

# Atama Şemaları
class SupportAssignmentOut(BaseModel):
    id: int
    ticket_id: int
    assigned_to: int
    assigned_by: int
    assigned_at: datetime
    unassigned_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

# Detaylı Ticket Şeması (mesajlar ve eklerle birlikte)
class SupportTicketDetailOut(SupportTicketOut):
    category: Optional[SupportCategoryOut] = None
    messages: List[SupportMessageOut] = []
    assignments: List[SupportAssignmentOut] = []

class SupportAssignmentCreate(BaseModel):
    moderator_id: int
