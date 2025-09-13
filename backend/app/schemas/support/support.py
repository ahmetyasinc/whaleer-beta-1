# app/schemas/profile/support/support.py
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List

# Support Tickets Schemas
class SupportTicketCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=500)
    message: str = Field(..., min_length=1)
    priority: str = Field(default="normal")
    type: str = Field(default="user")
    
    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v):
        allowed_priorities = ['low', 'normal', 'high', 'urgent']
        if v not in allowed_priorities:
            raise ValueError(f'Priority must be one of: {", ".join(allowed_priorities)}')
        return v
    
    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        allowed_types = ['user', 'admin', 'system']
        if v not in allowed_types:
            raise ValueError(f'Type must be one of: {", ".join(allowed_types)}')
        return v

class SupportTicketUpdate(BaseModel):
    subject: Optional[str] = Field(None, min_length=1, max_length=500)
    message: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = None
    priority: Optional[str] = None
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            allowed_statuses = ['open', 'in_progress', 'closed', 'pending']
            if v not in allowed_statuses:
                raise ValueError(f'Status must be one of: {", ".join(allowed_statuses)}')
        return v
    
    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v):
        if v is not None:
            allowed_priorities = ['low', 'normal', 'high', 'urgent']
            if v not in allowed_priorities:
                raise ValueError(f'Priority must be one of: {", ".join(allowed_priorities)}')
        return v

class SupportTicketOut(BaseModel):
    id: int
    user_id: int
    type: str
    subject: str
    message: str
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Support Attachments Schemas
class SupportAttachmentOut(BaseModel):
    id: int
    ticket_id: Optional[int]
    user_id: int
    filename: str
    storage_path: str
    mime_type: str
    size_bytes: int
    width: Optional[int]
    height: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class SupportAttachmentUpload(BaseModel):
    ticket_id: Optional[int] = None