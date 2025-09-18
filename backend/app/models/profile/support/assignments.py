# app/models/profile/support/assignments.py
from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class SupportAssignment(Base):
    __tablename__ = "support_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=False, index=True)
    assigned_to = Column(Integer, nullable=False, index=True)
    assigned_by = Column(Integer, nullable=False, index=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    unassigned_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<SupportAssignment(id={self.id}, ticket_id={self.ticket_id}, assigned_to={self.assigned_to})>"