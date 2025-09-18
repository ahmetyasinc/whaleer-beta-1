# app/models/profile/support/tickets.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("support_categories.id"), nullable=True, index=True)
    subject = Column(String(200), nullable=False)
    status = Column(String(20), nullable=False, default="open")
    priority = Column(String(10), nullable=False, default="normal")
    satisfaction_rating = Column(Integer, nullable=True)
    satisfaction_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    deleted = Column(Boolean, default=False, nullable=False)
    
    def __repr__(self):
        return f"<SupportTicket(id={self.id}, user_id={self.user_id}, subject='{self.subject}', status='{self.status}')>"