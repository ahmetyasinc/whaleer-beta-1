# app/routes/profile/support/support.py
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, or_, update, delete
from PIL import Image
from sqlalchemy.orm import selectinload
import aiofiles
from sqlalchemy.sql import func
from fastapi.responses import FileResponse
from app.database import get_db
from app.core.auth import verify_token
from app.core.get_user import get_user
from app.models.profile.support.tickets import SupportTicket
from app.models.profile.support.attachments import SupportAttachments
from app.models.profile.support.messages import SupportMessage
from app.models.profile.support.categories import SupportCategory
from app.models.profile.support.assignments import SupportAssignment
from app.models.user import User
from app.schemas.support.support import (
    SupportTicketCreate, 
    SupportTicketUpdate, 
    SupportTicketOut,
    SupportTicketDetailOut,
    SupportMessageCreate,
    SupportMessageOut,
    SupportTicketSatisfaction,
    SupportCategoryCreate,
    SupportCategoryOut,
    SupportAttachmentOut,  
    SupportAttachmentUpload,
    SupportAssignmentCreate,
)
# # app/routes/profile/support/support.py
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from PIL import Image
import aiofiles
from app.database import get_db
from app.core.auth import verify_token
from app.schemas.support.support import (
    SupportTicketCreate, 
    SupportTicketUpdate, 
    SupportTicketOut,
    SupportAttachmentOut
)

# Kullanıcı rollerini tanımla
ADMIN_ROLE = "ADMIN"
MODERATOR_ROLE = "MODERATOR"
USER_ROLE = "USER"

protected_router = APIRouter()

@protected_router.get("/api/support/admin/tickets", response_model=List[SupportTicketOut])
async def get_admin_tickets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    priority_filter: Optional[str] = Query(None),
    assigned_to_me: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    """
    Admin ve moderator için ticket listesi (ilişki kullanmadan kategori ve atanan moderator bilgisi enjekte edilir)
    """
    try:
        # --- Kullanıcı & rol kontrolü ---
        user_result = await db.execute(select(User).where(User.id == int(user_id)))
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.role not in [ADMIN_ROLE, MODERATOR_ROLE]:
            raise HTTPException(status_code=403, detail="Access denied")

        # --- Temel sorgu (SupportTicket) ---
        query = select(SupportTicket).order_by(desc(SupportTicket.created_at))

        # Moderator: sadece kendisine atanmış aktif ticket'lar
        if user.role == MODERATOR_ROLE:
            query = (
                query.join(SupportAssignment, SupportAssignment.ticket_id == SupportTicket.id)
                .where(
                    SupportAssignment.assigned_to == int(user_id),
                    SupportAssignment.unassigned_at.is_(None),
                )
            )

        # Admin: assigned_to_me True ise sadece kendisine atanmış aktif ticket'lar
        elif user.role == ADMIN_ROLE and assigned_to_me:
            query = (
                query.join(SupportAssignment, SupportAssignment.ticket_id == SupportTicket.id)
                .where(
                    SupportAssignment.assigned_to == int(user_id),
                    SupportAssignment.unassigned_at.is_(None),
                )
            )

        # Ek filtreler
        if status_filter:
            query = query.where(SupportTicket.status == status_filter)
        if priority_filter:
            query = query.where(SupportTicket.priority == priority_filter)

        # Sayfalama
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        tickets = result.scalars().all()

        if not tickets:
            return []

        # --- Aktif atamalar + moderatör bilgileri (tek sorgu, map'e dön) ---
        ticket_ids = [t.id for t in tickets]

        assignments_result = await db.execute(
            select(
                SupportAssignment.ticket_id,
                User.id.label("mod_id"),
                User.name.label("mod_name"),
                User.email.label("mod_email"),
            )
            .join(User, User.id == SupportAssignment.assigned_to)
            .where(
                SupportAssignment.ticket_id.in_(ticket_ids),
                SupportAssignment.unassigned_at.is_(None),
            )
        )
        rows = assignments_result.all()
        mod_map = {
            r.ticket_id: {"id": r.mod_id, "name": r.mod_name, "email": r.mod_email}
            for r in rows
        }

        # --- Kategorileri topluca getir ve map'e dön (ilişki kullanmadan) ---
        category_ids = list({t.category_id for t in tickets if t.category_id})
        if category_ids:
            cats_res = await db.execute(
                select(SupportCategory).where(SupportCategory.id.in_(category_ids))
            )
            cats = cats_res.scalars().all()
            cat_map = {c.id: c for c in cats}
        else:
            cat_map = {}

        # --- Her ticket'a alanları enjekte et ---
        for t in tickets:
            # Pydantic v2 from_attributes=True olduğu için dict/ORM objesi kabul eder
            setattr(t, "assigned_moderator", mod_map.get(t.id) or None)
            setattr(t, "category", cat_map.get(t.category_id) if t.category_id else None)

        return tickets

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tickets: {str(e)}")

@protected_router.get("/api/users/moderators")
async def get_moderators(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Get all moderators (only accessible by admin)"""
    try:
        # Kullanıcı kontrolü - sadece admin erişebilir
        user_result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = user_result.scalar_one_or_none()
        
        if not user or user.role != ADMIN_ROLE:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Moderator'leri getir
        moderators_result = await db.execute(
            select(User).where(User.role == MODERATOR_ROLE).order_by(User.name)
        )
        moderators = moderators_result.scalars().all()
        
        return moderators
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching moderators: {str(e)}")

@protected_router.post("/api/support/admin/tickets/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: int,
    assignment_data: SupportAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Assign ticket to moderator (admin only)"""
    try:
        # Kullanıcı kontrolü - sadece admin erişebilir
        user_result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = user_result.scalar_one_or_none()
        
        if not user or user.role != ADMIN_ROLE:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Ticket kontrolü
        ticket_result = await db.execute(
            select(SupportTicket).where(SupportTicket.id == ticket_id)
        )
        ticket = ticket_result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Moderator kontrolü
        moderator_result = await db.execute(
            select(User).where(
                and_(
                    User.id == assignment_data.moderator_id,
                    User.role == MODERATOR_ROLE
                )
            )
        )
        moderator = moderator_result.scalar_one_or_none()
        
        if not moderator:
            raise HTTPException(status_code=404, detail="Moderator not found")
        
        # Varolan atamaları sil
        await db.execute(
            delete(SupportAssignment).where(SupportAssignment.ticket_id == ticket_id)
        )
        
        # Yeni atama oluştur
        new_assignment = SupportAssignment(
            ticket_id=ticket_id,
            assigned_to=moderator.id,
            assigned_by=int(user_id)
        )
        
        db.add(new_assignment)
        await db.commit()
        
        return {"message": "Ticket assigned successfully"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error assigning ticket: {str(e)}")

@protected_router.delete("/api/support/tickets/{ticket_id}/assign")
async def unassign_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Unassign ticket from moderator (admin only)"""
    try:
        # Kullanıcı kontrolü - sadece admin erişebilir
        user_result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = user_result.scalar_one_or_none()
        
        if not user or user.role != ADMIN_ROLE:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Ticket kontrolü
        ticket_result = await db.execute(
            select(SupportTicket).where(SupportTicket.id == ticket_id)
        )
        ticket = ticket_result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Atamaları sil
        await db.execute(
            delete(SupportAssignment).where(SupportAssignment.ticket_id == ticket_id)
        )
        
        await db.commit()
        
        return {"message": "Ticket unassigned successfully"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error unassigning ticket: {str(e)}")

@protected_router.patch("/api/support/tickets/{ticket_id}")
async def update_ticket_status(
    ticket_id: int,
    status_update: dict,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Update ticket status (admin/moderator only)"""
    try:
        # Kullanıcı kontrolü - sadece admin ve moderator erişebilir
        user_result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = user_result.scalar_one_or_none()
        
        if not user or user.role not in [ADMIN_ROLE, MODERATOR_ROLE]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Moderator sadece kendisine atanmış ticket'ları güncelleyebilir
        if user.role == MODERATOR_ROLE:
            assignment_result = await db.execute(
                select(SupportAssignment).where(
                    and_(
                        SupportAssignment.ticket_id == ticket_id,
                        SupportAssignment.assigned_to == int(user_id)
                    )
                )
            )
            assignment = assignment_result.scalar_one_or_none()
            
            if not assignment:
                raise HTTPException(status_code=403, detail="You can only update tickets assigned to you")
        
        # Ticket kontrolü
        ticket_result = await db.execute(
            select(SupportTicket).where(SupportTicket.id == ticket_id)
        )
        ticket = ticket_result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Durumu güncelle
        if 'status' in status_update:
            ticket.status = status_update['status']
            ticket.updated_at = func.now()
        
        await db.commit()
        await db.refresh(ticket)
        
        return ticket
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating ticket: {str(e)}")

@protected_router.get("/api/support/admin/tickets/{ticket_id}", response_model=SupportTicketDetailOut)
async def get_admin_ticket_detail(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Admin/moderator için ticket detayları"""
    try:
        # Kullanıcı kontrolü - sadece admin ve moderator erişebilir
        user_result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = user_result.scalar_one_or_none()
        
        if not user or user.role not in [ADMIN_ROLE, MODERATOR_ROLE]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Ticket'ı bul
        result = await db.execute(
            select(SupportTicket).where(SupportTicket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Moderator sadece kendisine atanmış ticket'ları görebilir
        if user.role == MODERATOR_ROLE:
            assignment_result = await db.execute(
                select(SupportAssignment).where(
                    and_(
                        SupportAssignment.ticket_id == ticket_id,
                        SupportAssignment.assigned_to == int(user_id)
                    )
                )
            )
            assignment = assignment_result.scalar_one_or_none()
            
            if not assignment:
                raise HTTPException(status_code=403, detail="Access to this ticket denied")
        
        # Tüm mesajları getir (internal mesajlar dahil)
        messages_result = await db.execute(
            select(SupportMessage).where(
                SupportMessage.ticket_id == ticket_id
            ).order_by(SupportMessage.created_at)
        )
        messages = messages_result.scalars().all()
        
        # Her mesaj için attachment'ları getir
        for message in messages:
            attachments_result = await db.execute(
                select(SupportAttachments).where(
                    SupportAttachments.message_id == message.id
                )
            )
            message.attachments = attachments_result.scalars().all()
        
        ticket.messages = messages
        
        # Atamaları getir
        assignments_result = await db.execute(
            select(SupportAssignment).where(SupportAssignment.ticket_id == ticket_id)
        )
        ticket.assignments = assignments_result.scalars().all()
        
        return ticket
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching ticket: {str(e)}")


@protected_router.get("/api/support/categories", response_model=List[SupportCategoryOut])
async def get_support_categories(
    db: AsyncSession = Depends(get_db)
):
    """Get all active support categories"""
    try:
        result = await db.execute(
            select(SupportCategory).where(SupportCategory.is_active.is_(True))
        )
        categories = result.scalars().all()
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching categories: {str(e)}")

# Ticket listesi endpoint'i
@protected_router.get("/api/support/tickets", response_model=List[SupportTicketOut])
async def get_tickets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    priority_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Get tickets based on user role"""
    try:
        # Kullanıcı bilgilerini ve rolünü al
        user_result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Temel sorgu
        query = select(SupportTicket).order_by(desc(SupportTicket.created_at))
        
        # Kullanıcı rolüne göre filtreleme
        if user.role == ADMIN_ROLE:
            # ADMIN tüm ticket'ları görür
            pass
        elif user.role == MODERATOR_ROLE:
            # MODERATOR sadece kendisine atanmış ticket'ları görür
            query = query.join(
                SupportAssignment, 
                SupportAssignment.ticket_id == SupportTicket.id
            ).where(
                SupportAssignment.assigned_to == int(user_id)
            )
        else:
            # Normal kullanıcı sadece kendi ticket'larını görür
            query = query.where(SupportTicket.user_id == int(user_id))
        
        # Ek filtreler
        if status_filter:
            query = query.where(SupportTicket.status == status_filter)
        
        if priority_filter:
            query = query.where(SupportTicket.priority == priority_filter)
        
        # Sayfalama
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        tickets = result.scalars().all()
        
        return tickets
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tickets: {str(e)}")

# Ticket detaylarını getir
# Ticket detaylarını getir
@protected_router.get("/api/support/tickets/{ticket_id}", response_model=SupportTicketDetailOut)
async def get_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Get a specific ticket with messages and attachments"""
    try:
        # Kullanıcı bilgilerini ve rolünü al
        user_result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Temel sorgu - rol bazlı filtreleme
        if user.role in [ADMIN_ROLE, MODERATOR_ROLE]:
            # Admin ve moderator için farklı kontrol
            if user.role == MODERATOR_ROLE:
                # Moderator sadece kendisine atanmış ticket'ları görebilir
                assignment_result = await db.execute(
                    select(SupportAssignment).where(
                        and_(
                            SupportAssignment.ticket_id == ticket_id,
                            SupportAssignment.assigned_to == int(user_id)
                        )
                    )
                )
                assignment = assignment_result.scalar_one_or_none()
                
                if not assignment:
                    raise HTTPException(status_code=403, detail="Access to this ticket denied")
            
            # Admin ve yetkili moderator tüm ticket'ları görebilir
            result = await db.execute(
                select(SupportTicket).where(SupportTicket.id == ticket_id)
            )
        else:
            # Normal kullanıcı sadece kendi ticket'larını görebilir
            result = await db.execute(
                select(SupportTicket).where(
                    and_(
                        SupportTicket.id == ticket_id,
                        SupportTicket.user_id == int(user_id)
                    )
                )
            )
        
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Mesajları getir - rol bazlı internal mesaj kontrolü
        if user.role in [ADMIN_ROLE, MODERATOR_ROLE]:
            # Admin ve moderator tüm mesajları görür
            messages_query = select(SupportMessage).where(
                SupportMessage.ticket_id == ticket_id
            )
        else:
            # Normal kullanıcı sadece internal olmayan mesajları görür
            messages_query = select(SupportMessage).where(
                and_(
                    SupportMessage.ticket_id == ticket_id,
                    SupportMessage.is_internal.is_(False)
                )
            )
        
        messages_result = await db.execute(messages_query.order_by(SupportMessage.created_at))
        messages = messages_result.scalars().all()
        
        # Her mesaj için attachment'ları getir
        for message in messages:
            attachments_result = await db.execute(
                select(SupportAttachments).where(
                    SupportAttachments.message_id == message.id
                )
            )
            message.attachments = attachments_result.scalars().all()
        
        ticket.messages = messages
        
        # Atamaları getir
        assignments_result = await db.execute(
            select(SupportAssignment).where(SupportAssignment.ticket_id == ticket_id)
        )
        ticket.assignments = assignments_result.scalars().all()
        
        return ticket
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching ticket: {str(e)}")

# Ticket'a mesaj ekle
@protected_router.post("/api/support/tickets/{ticket_id}/messages", response_model=SupportMessageOut)
async def add_message(
    ticket_id: int,
    message_data: SupportMessageCreate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Add a message to a support ticket"""
    try:
        # Ticket'ı bul ve kullanıcı kontrolü
        result = await db.execute(
            select(SupportTicket).where(
                and_(
                    SupportTicket.id == ticket_id,
                    SupportTicket.user_id == int(user_id),
                    SupportTicket.deleted.is_(False)
                )
            )
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Kapalı ticket'a mesaj eklenemez
        if ticket.status == "closed":
            raise HTTPException(status_code=400, detail="Cannot add message to closed ticket")
        
        # Yeni mesaj oluştur
        new_message = SupportMessage(
            ticket_id=ticket_id,
            user_id=int(user_id),
            message=message_data.message,
            is_internal=message_data.is_internal
        )
        
        db.add(new_message)
        
        # Ticket'ı güncelle
        ticket.updated_at = func.now()
        if ticket.status == "resolved":
            ticket.status = "open"  # Yanıt geldiğinde tekrar aç
        
        await db.commit()
        await db.refresh(new_message)
        
        return new_message
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding message: {str(e)}")

# Ticket'ı memnuniyet ile kapat
@protected_router.post("/api/support/tickets/{ticket_id}/close")
async def close_ticket(
    ticket_id: int,
    satisfaction_data: SupportTicketSatisfaction,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Close a ticket with satisfaction rating"""
    try:
        # Ticket'ı bul ve kullanıcı kontrolü
        result = await db.execute(
            select(SupportTicket).where(
                and_(
                    SupportTicket.id == ticket_id,
                    SupportTicket.user_id == int(user_id),
                    SupportTicket.deleted.is_(False)
                )
            )
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Zaten kapalıysa
        if ticket.status == "closed":
            raise HTTPException(status_code=400, detail="Ticket already closed")
        
        # Memnuniyet bilgilerini kaydet ve kapat
        ticket.satisfaction_rating = satisfaction_data.rating
        ticket.satisfaction_feedback = satisfaction_data.feedback
        ticket.status = "closed"
        ticket.closed_at = func.now()
        ticket.updated_at = func.now()
        
        await db.commit()
        
        return {"message": "Ticket closed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error closing ticket: {str(e)}")

@protected_router.post("/api/support/admin/tickets/{ticket_id}/messages")
async def admin_add_message(
    ticket_id: int,
    message_data: SupportMessageCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_user)
):
    # Kullanıcının admin yetkilerini kontrol et
    if not user.get("role", False):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    # Ticket'ı bul
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket bulunamadı")
    
    # Yeni mesaj oluştur
    new_message = SupportMessage(
        ticket_id=ticket_id,
        user_id = user.get("id"),
        message=message_data.message,
        is_internal=message_data.is_internal  # Internal mesaj olabilir
    )
    
    db.add(new_message)
    
    # Ticket durumunu güncelle (eğer kapalı değilse)
    if ticket.status != "closed":
        ticket.status = "in_progress"
        ticket.updated_at = func.now()
    
    await db.commit()
    await db.refresh(new_message)
    
    return new_message

# Allowed file types for attachments
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.zip', '.rar'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
UPLOAD_DIR = "uploads/support"

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

# GET single ticket by ID
@protected_router.get("/api/support/tickets/{ticket_id}", response_model=SupportTicketOut)
async def get_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Get a specific ticket by ID"""
    try:
        result = await db.execute(
            select(SupportTicket).where(
                and_(
                    SupportTicket.id == ticket_id,
                    SupportTicket.user_id == int(user_id),
                    SupportTicket.deleted.is_(False)
                )
            )
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
            
        return ticket
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching ticket: {str(e)}")

@protected_router.post("/api/support/tickets", response_model=SupportTicketOut)
async def create_ticket(
    subject: str = Form(..., min_length=1, max_length=200),
    message: str = Form(..., min_length=1),
    priority: str = Form("normal"),
    category_id: Optional[int] = Form(None),
    files: Optional[List[UploadFile]] = File(None),   # çoklu dosya
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    """
    Yeni ticket oluşturur, kullanıcının ilk mesajını kaydeder,
    ekleri diske yazar ve message_id ile ilişkilendirir.
    """
    saved_file_paths = []
    try:
        # 1) Ticket
        ticket = SupportTicket(
            user_id=int(user_id),
            subject=subject,
            priority=priority,
            status="open",
            category_id=category_id,
        )
        db.add(ticket)
        # id almak için commit etmeden flush
        await db.flush()

        # 2) İlk mesaj
        first_message = SupportMessage(
            ticket_id=ticket.id,
            user_id=int(user_id),
            message=message,
            is_internal=False,
        )
        db.add(first_message)
        await db.flush()  # first_message.id için

        # 3) Ekler (varsa)
        if files:
            os.makedirs(UPLOAD_DIR, exist_ok=True)

            for up in files:
                # uzantı / boyut kontrolü
                file_ext = os.path.splitext(up.filename)[1].lower()
                if file_ext not in ALLOWED_EXTENSIONS:
                    raise HTTPException(
                        status_code=400,
                        detail=f"File type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
                    )

                content = await up.read()
                if len(content) > MAX_FILE_SIZE:
                    raise HTTPException(status_code=400, detail="File too large. Max size: 10MB")
                await up.seek(0)

                # benzersiz isim ve kaydetme
                unique = f"{uuid.uuid4()}{file_ext}"
                path = os.path.join(UPLOAD_DIR, unique)
                async with aiofiles.open(path, "wb") as f:
                    await f.write(content)
                saved_file_paths.append(path)

                # görsel boyutu (opsiyonel)
                width, height = None, None
                if file_ext in {".jpg", ".jpeg", ".png", ".gif"}:
                    try:
                        with Image.open(path) as img:
                            width, height = img.size
                    except Exception:
                        pass

                attach = SupportAttachments(
                    ticket_id=ticket.id,
                    message_id=first_message.id,
                    user_id=int(user_id),
                    filename=up.filename,
                    storage_path=path,
                    mime_type=up.content_type or "application/octet-stream",
                    size_bytes=len(content),
                    width=width,
                    height=height,
                )
                db.add(attach)

        # 4) commit
        await db.commit()
        await db.refresh(ticket)
        return ticket

    except HTTPException:
        # dosya hatasında geri sarma gerekmez (HTTPException zaten anlamlı)
        await db.rollback()
        # diske yazılmış dosyaları temizle
        for p in saved_file_paths:
            if os.path.exists(p):
                try: os.remove(p)
                except Exception: pass
        raise
    except Exception as e:
        await db.rollback()
        for p in saved_file_paths:
            if os.path.exists(p):
                try: os.remove(p)
                except Exception: pass
        raise HTTPException(status_code=500, detail=f"Error creating ticket: {str(e)}")

# PUT update ticket
@protected_router.put("/api/support/tickets/{ticket_id}", response_model=SupportTicketOut)
async def update_ticket(
    ticket_id: int,
    ticket_data: SupportTicketUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Update an existing ticket"""
    try:
        result = await db.execute(
            select(SupportTicket).where(
                and_(
                    SupportTicket.id == ticket_id,
                    SupportTicket.user_id == int(user_id),
                    SupportTicket.deleted.is_(False)
                )
            )
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
            
        # Update only provided fields
        for field, value in ticket_data.dict(exclude_unset=True).items():
            setattr(ticket, field, value)
            
        await db.commit()
        await db.refresh(ticket)
        
        return ticket
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating ticket: {str(e)}")

# DELETE ticket (soft delete)
@protected_router.delete("/api/support/tickets/{ticket_id}")
async def delete_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Soft delete a ticket"""
    try:
        result = await db.execute(
            select(SupportTicket).where(
                and_(
                    SupportTicket.id == ticket_id,
                    SupportTicket.user_id == int(user_id),
                    SupportTicket.deleted.is_(False)
                )
            )
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
            
        ticket.deleted = True
        await db.commit()
        
        return {"message": "Ticket deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting ticket: {str(e)}")

# POST upload attachment
@protected_router.post("/api/support/attachments", response_model=SupportAttachmentOut)
async def upload_attachment(
    file: UploadFile = File(...),
    ticket_id: Optional[int] = Form(None),
    message_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    """
    Destek eki yükleme.

    - message_id gönderilirse: mesajın varlığı ve sahipliği doğrulanır. ticket_id yoksa mesajdan türetilir.
    - yalnız ticket_id gönderilirse: ticket kullanıcının bizzat kendisine ait olmalı.
    - her ikisi de None ise 400 döner.
    """
    try:
        # En az bir bağlam olmalı
        if ticket_id is None and message_id is None:
            raise HTTPException(status_code=400, detail="ticket_id veya message_id zorunludur")

        # 1) Dosya tip/boyut kontrolü
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
            )

        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max size: 10MB")
        await file.seek(0)

        # 2) Önce dosyayı diske yaz
        unique = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique)
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        # 3) Görsel ise boyutlarını al
        width, height = None, None
        if file_ext in {".jpg", ".jpeg", ".png", ".gif"}:
            try:
                with Image.open(file_path) as img:
                    width, height = img.size
            except Exception:
                pass

        # 4) Bağlam doğrulamaları
        # message_id önceliklidir; varsa mesajı ve sahipliği doğrula
        if message_id is not None:
            q = await db.execute(select(SupportMessage).where(SupportMessage.id == message_id))
            msg = q.scalar_one_or_none()
            if not msg:
                os.remove(file_path)
                raise HTTPException(status_code=404, detail="Message not found")

            # Bu endpoint kullanıcıya açık; farklı roller için ayrı endpoint düşünülmeli
            if int(msg.user_id) != int(user_id):
                os.remove(file_path)
                raise HTTPException(status_code=403, detail="You cannot attach to this message")

            # ticket_id gönderildiyse mesajın ticket'ı ile eşleşmeli
            if ticket_id is not None and int(msg.ticket_id) != int(ticket_id):
                os.remove(file_path)
                raise HTTPException(status_code=400, detail="message_id ticket_id ile uyuşmuyor")

            # ticket_id yoksa mesajdan türet
            if ticket_id is None:
                ticket_id = int(msg.ticket_id)

        # Sadece ticket_id varsa ticket sahipliğini kontrol et
        else:
            q = await db.execute(
                select(SupportTicket).where(
                    and_(
                        SupportTicket.id == int(ticket_id),
                        SupportTicket.user_id == int(user_id),
                        SupportTicket.deleted.is_(False),
                    )
                )
            )
            ticket = q.scalar_one_or_none()
            if not ticket:
                os.remove(file_path)
                raise HTTPException(status_code=404, detail="Ticket not found")

        # 5) Kayıt oluştur
        attachment = SupportAttachments(
            ticket_id=int(ticket_id) if ticket_id is not None else None,
            message_id=int(message_id) if message_id is not None else None,
            user_id=int(user_id),
            filename=file.filename,
            storage_path=file_path,  # sunucudaki mutlak/bağıl yol
            mime_type=file.content_type or "application/octet-stream",
            size_bytes=len(content),
            width=width,
            height=height,
        )

        db.add(attachment)
        await db.commit()
        await db.refresh(attachment)
        return attachment

    except HTTPException:
        raise
    except Exception as e:
        if "file_path" in locals() and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error uploading attachment: {str(e)}")


# GET attachments for a ticket
# app/routes/profile/support/support.py içinde
@protected_router.get("/api/support/tickets/{ticket_id}/attachments", response_model=List[SupportAttachmentOut])
async def get_ticket_attachments(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Get all attachments for a specific ticket"""
    try:
        # Verify ticket ownership
        ticket_result = await db.execute(
            select(SupportTicket).where(
                and_(
                    SupportTicket.id == ticket_id,
                    SupportTicket.user_id == int(user_id),
                    SupportTicket.deleted.is_(False)
                )
            )
        )
        ticket = ticket_result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Get attachments
        result = await db.execute(
            select(SupportAttachments).where(
                SupportAttachments.ticket_id == ticket_id
            ).order_by(desc(SupportAttachments.created_at))
        )
        
        attachments = result.scalars().all()
        return attachments
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching attachments: {str(e)}")

# GET file by attachment ID (serve files)
@protected_router.get("/api/support/attachments/{attachment_id}/file")
async def get_attachment_file(
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_user)
):
    """
    Dosya sunumu.
    Ek sahibi ADMIN/MODERATOR ise: herkes görebilir (sahiplik/rol kontrolü yok).
    Aksi halde: ADMIN/MODERATOR serbest; normal kullanıcı sadece kendi ekini görebilir.
    """
    try:
        # 1) Eki çek
        res = await db.execute(
            select(SupportAttachments).where(SupportAttachments.id == attachment_id)
        )
        attachment = res.scalar_one_or_none()
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")

        # 2) Ek sahibinin rolünü al
        owner_row = await db.execute(select(User.role).where(User.id == attachment.user_id))
        owner_role = owner_row.scalar_one_or_none()

        # 3) İstekte bulunan kullanıcının rolünü güvenle al
        requester_role = getattr(user, "role", None)
        if requester_role is None and isinstance(user, dict):
            requester_role = user.get("role")

        # 4) Erişim izni
        allowed = False

        # Ek sahibi admin/moderator ise herkes görebilir
        if owner_role in [ADMIN_ROLE, MODERATOR_ROLE]:
            allowed = True
        else:
            # ADMIN/MODERATOR her zaman görebilir
            if requester_role in [ADMIN_ROLE, MODERATOR_ROLE]:
                allowed = True
            else:
                # Normal kullanıcı: sadece kendi eki
                requester_id = getattr(user, "id", None)
                if requester_id is None and isinstance(user, dict):
                    requester_id = user.get("id")
                allowed = (attachment.user_id == requester_id)

        if not allowed:
            raise HTTPException(status_code=403, detail="Access denied")

        # 5) Dosya mevcut mu?
        if not os.path.exists(attachment.storage_path):
            raise HTTPException(status_code=404, detail="File not found on disk")

        # 6) Dosyayı döndür
        return FileResponse(
            path=attachment.storage_path,
            filename=attachment.filename,
            media_type=attachment.mime_type,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")


# GET thumbnail by attachment ID
@protected_router.get("/api/support/attachments/{attachment_id}/thumbnail")
async def get_attachment_thumbnail(
    attachment_id: int,
    size: int = Query(150, ge=50, le=500),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_user)
):
    """
    Thumbnail sunumu.
    Ek sahibi ADMIN/MODERATOR ise: herkes görebilir (sahiplik/rol kontrolü yok).
    Aksi halde: ADMIN/MODERATOR serbest; normal kullanıcı sadece kendi ekinin thumbnail’ini alabilir.
    """
    try:
        # 1) Eki çek
        res = await db.execute(
            select(SupportAttachments).where(SupportAttachments.id == attachment_id)
        )
        attachment = res.scalar_one_or_none()
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")

        if not attachment.mime_type or not attachment.mime_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Not an image file")

        # 2) Ek sahibinin rolü
        owner_row = await db.execute(select(User.role).where(User.id == attachment.user_id))
        owner_role = owner_row.scalar_one_or_none()

        # 3) İstekte bulunan rol
        requester_role = getattr(user, "role", None)
        if requester_role is None and isinstance(user, dict):
            requester_role = user.get("role")

        # 4) Erişim izni belirle
        allowed = False
        if owner_role in [ADMIN_ROLE, MODERATOR_ROLE]:
            allowed = True
        else:
            if requester_role in [ADMIN_ROLE, MODERATOR_ROLE]:
                allowed = True
            else:
                requester_id = getattr(user, "id", None)
                if requester_id is None and isinstance(user, dict):
                    requester_id = user.get("id")
                allowed = (attachment.user_id == requester_id)

        if not allowed:
            raise HTTPException(status_code=403, detail="Access denied")

        # 5) Orijinal dosya mevcut mu?
        if not os.path.exists(attachment.storage_path):
            raise HTTPException(status_code=404, detail="File not found on disk")

        # 6) Thumbnail üret/yükle
        thumbnail_dir = os.path.join(UPLOAD_DIR, "thumbnails")
        os.makedirs(thumbnail_dir, exist_ok=True)
        file_ext = os.path.splitext(attachment.storage_path)[1]
        thumbnail_filename = f"{attachment_id}_{size}{file_ext}"
        thumbnail_path = os.path.join(thumbnail_dir, thumbnail_filename)

        if not os.path.exists(thumbnail_path):
            try:
                with Image.open(attachment.storage_path) as img:
                    if img.mode in ("RGBA", "LA", "P"):
                        img = img.convert("RGB")
                    img.thumbnail((size, size), Image.Resampling.LANCZOS)
                    img.save(thumbnail_path, quality=85, optimize=True)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error creating thumbnail: {str(e)}")

        return FileResponse(
            path=thumbnail_path,
            media_type=attachment.mime_type,
            headers={"Cache-Control": "max-age=3600"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving thumbnail: {str(e)}")


    