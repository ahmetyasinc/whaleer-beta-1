# app/models/profile/support/tickets.py
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base

class SupportTickets(Base):
    __tablename__ = "support_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    type = Column(String(50), nullable=False, default="user")  # user, admin, system
    subject = Column(Text, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="open")  # open, in_progress, closed, pending
    priority = Column(String(10), nullable=False, default="normal")  # low, normal, high, urgent
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted = Column(Boolean, default=False, nullable=False)
    
    def __repr__(self):
        return f"<SupportTickets(id={self.id}, user_id={self.user_id}, subject='{self.subject}', status='{self.status}')>"