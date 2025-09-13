# app/routes/profile/support/support.py
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from PIL import Image
import aiofiles
from fastapi.responses import FileResponse
from app.database import get_db
from app.core.auth import verify_token
from app.models.profile.support.tickets import SupportTickets
from app.models.profile.support.attachments import SupportAttachments
from app.schemas.support.support import (
    SupportTicketCreate, 
    SupportTicketUpdate, 
    SupportTicketOut,
    SupportAttachmentOut
)

protected_router = APIRouter()

# Allowed file types for attachments
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.zip', '.rar'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
UPLOAD_DIR = "uploads/support"

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

# GET all tickets for user
@protected_router.get("/api/support/tickets", response_model=List[SupportTicketOut])
async def get_tickets(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, pattern="^(open|in_progress|closed|pending)$"),
    priority: Optional[str] = Query(None, pattern="^(low|normal|high|urgent)$"),
    db: AsyncSession = Depends(get_db), 
    user_id: dict = Depends(verify_token)
):
    """Get paginated tickets for the authenticated user"""
    try:
        # Base query
        query = select(SupportTickets).where(
            and_(
                SupportTickets.user_id == int(user_id),
                SupportTickets.deleted.is_(False)
            )
        )
        
        # Add filters with validation
        if status:
            allowed_statuses = ['open', 'in_progress', 'closed', 'pending']
            if status not in allowed_statuses:
                raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(allowed_statuses)}")
            query = query.where(SupportTickets.status == status)
            
        if priority:
            allowed_priorities = ['low', 'normal', 'high', 'urgent']
            if priority not in allowed_priorities:
                raise HTTPException(status_code=400, detail=f"Invalid priority. Must be one of: {', '.join(allowed_priorities)}")
            query = query.where(SupportTickets.priority == priority)
            
        # Add pagination and ordering
        offset = (page - 1) * limit
        query = query.order_by(desc(SupportTickets.created_at)).offset(offset).limit(limit)
        
        result = await db.execute(query)
        tickets = result.scalars().all()
        
        return tickets
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tickets: {str(e)}")

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
            select(SupportTickets).where(
                and_(
                    SupportTickets.id == ticket_id,
                    SupportTickets.user_id == int(user_id),
                    SupportTickets.deleted.is_(False)
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

# POST create new ticket
@protected_router.post("/api/support/tickets", response_model=SupportTicketOut)
async def create_ticket(
    ticket_data: SupportTicketCreate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Create a new support ticket"""
    try:
        new_ticket = SupportTickets(
            user_id=int(user_id),
            subject=ticket_data.subject,
            message=ticket_data.message,
            priority=ticket_data.priority,
            type=ticket_data.type,
            status="open"
        )
        
        db.add(new_ticket)
        await db.commit()
        await db.refresh(new_ticket)
        
        return new_ticket
        
    except Exception as e:
        await db.rollback()
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
            select(SupportTickets).where(
                and_(
                    SupportTickets.id == ticket_id,
                    SupportTickets.user_id == int(user_id),
                    SupportTickets.deleted.is_(False)
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
            select(SupportTickets).where(
                and_(
                    SupportTickets.id == ticket_id,
                    SupportTickets.user_id == int(user_id),
                    SupportTickets.deleted.is_(False)
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
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Upload file attachment for support ticket"""
    try:
        # Validate file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Check file size
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max size: 10MB")
            
        # Reset file position
        await file.seek(0)
        
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        # Get image dimensions if it's an image
        width, height = None, None
        if file_ext in {'.jpg', '.jpeg', '.png', '.gif'}:
            try:
                with Image.open(file_path) as img:
                    width, height = img.size
            except Exception:
                pass  # Not a valid image or couldn't process
        
        # Verify ticket ownership if ticket_id provided
        if ticket_id:
            ticket_result = await db.execute(
                select(SupportTickets).where(
                    and_(
                        SupportTickets.id == ticket_id,
                        SupportTickets.user_id == int(user_id),
                        SupportTickets.deleted.is_(False)
                    )
                )
            )
            if not ticket_result.scalar_one_or_none():
                # Clean up uploaded file
                os.remove(file_path)
                raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Create attachment record
        attachment = SupportAttachments(
            ticket_id=ticket_id,
            user_id=int(user_id),
            filename=file.filename,
            storage_path=file_path,
            mime_type=file.content_type or "application/octet-stream",
            size_bytes=len(file_content),
            width=width,
            height=height
        )
        
        db.add(attachment)
        await db.commit()
        await db.refresh(attachment)
        
        return attachment
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up file if database operation failed
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error uploading attachment: {str(e)}")

# GET attachments for a ticket
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
            select(SupportTickets).where(
                and_(
                    SupportTickets.id == ticket_id,
                    SupportTickets.user_id == int(user_id)
                    # SupportTickets.deleted.is_(False)  # Commented out until deleted column added
                )
            )
        )
        if not ticket_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Get attachments
        result = await db.execute(
            select(SupportAttachments).where(
                SupportAttachments.ticket_id == ticket_id
            ).order_by(desc(SupportAttachments.created_at))
        )
        
        return result.scalars().all()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching attachments: {str(e)}")

# GET file by attachment ID (serve files)
@protected_router.get("/api/support/attachments/{attachment_id}/file")
async def get_attachment_file(
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Serve attachment file to user"""
    try:
        # Get attachment and verify ownership
        result = await db.execute(
            select(SupportAttachments).where(
                and_(
                    SupportAttachments.id == attachment_id,
                    SupportAttachments.user_id == int(user_id)
                )
            )
        )
        attachment = result.scalar_one_or_none()
        
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")
            
        # Check if file exists
        if not os.path.exists(attachment.storage_path):
            raise HTTPException(status_code=404, detail="File not found on disk")
            
        # Return file
        return FileResponse(
            path=attachment.storage_path,
            filename=attachment.filename,
            media_type=attachment.mime_type
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
    user_id: dict = Depends(verify_token)
):
    """Serve optimized thumbnail for image attachments"""
    try:
        # Get attachment and verify ownership
        result = await db.execute(
            select(SupportAttachments).where(
                and_(
                    SupportAttachments.id == attachment_id,
                    SupportAttachments.user_id == int(user_id)
                )
            )
        )
        attachment = result.scalar_one_or_none()
        
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")
            
        # Check if it's an image
        if not attachment.mime_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Not an image file")
            
        # Check if original file exists
        if not os.path.exists(attachment.storage_path):
            raise HTTPException(status_code=404, detail="File not found on disk")
        
        # Create thumbnail cache directory
        thumbnail_dir = os.path.join(UPLOAD_DIR, "thumbnails")
        os.makedirs(thumbnail_dir, exist_ok=True)
        
        # Generate thumbnail filename
        file_ext = os.path.splitext(attachment.storage_path)[1]
        thumbnail_filename = f"{attachment_id}_{size}{file_ext}"
        thumbnail_path = os.path.join(thumbnail_dir, thumbnail_filename)
        
        # Create thumbnail if it doesn't exist
        if not os.path.exists(thumbnail_path):
            try:
                with Image.open(attachment.storage_path) as img:
                    # Convert to RGB if necessary (for JPEG)
                    if img.mode in ('RGBA', 'LA', 'P'):
                        img = img.convert('RGB')
                    
                    # Create thumbnail maintaining aspect ratio
                    img.thumbnail((size, size), Image.Resampling.LANCZOS)
                    
                    # Save thumbnail
                    img.save(thumbnail_path, quality=85, optimize=True)
                    
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error creating thumbnail: {str(e)}")
        
        # Return thumbnail
        return FileResponse(
            path=thumbnail_path,
            media_type=attachment.mime_type,
            headers={"Cache-Control": "max-age=3600"}  # Cache for 1 hour
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving thumbnail: {str(e)}")