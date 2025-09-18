# app/models/profile/support/messages.py
from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class SupportMessage(Base):
    __tablename__ = "support_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    message = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<SupportMessage(id={self.id}, ticket_id={self.ticket_id}, user_id={self.user_id})>"