# app/models/profile/support/attachments.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class SupportAttachments(Base):
    __tablename__ = "support_attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=True, index=True)
    message_id = Column(Integer, ForeignKey("support_messages.id"), nullable=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    filename = Column(Text, nullable=False)
    storage_path = Column(Text, nullable=False)
    mime_type = Column(Text, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<SupportAttachments(id={self.id}, ticket_id={self.ticket_id}, filename='{self.filename}')>"