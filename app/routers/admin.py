from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import re
from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.markdown import MarkdownCreate, MarkdownUpdate, MarkdownResponse, MarkdownList
from app.services import markdown_service, download_service

router = APIRouter(prefix="/api/admin/files", tags=["admin"])


@router.get("", response_model=list[MarkdownList])
async def list_all_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all markdown files (including archived) - Admin only."""
    files = markdown_service.get_all_files(db, include_archived=True)
    return files


@router.get("/{file_id}", response_model=MarkdownResponse)
async def get_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific markdown file by ID - Admin only."""
    db_file = markdown_service.get_file_by_id(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    return db_file


@router.post("", response_model=MarkdownResponse, status_code=status.HTTP_201_CREATED)
async def create_file(
    file: MarkdownCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new markdown file - Admin only."""
    existing_file = markdown_service.get_file_by_slug(db, file.slug, file.folder_id, active_only=False)
    if existing_file:
        raise HTTPException(status_code=400, detail="File with this slug already exists in this folder")
    
    return markdown_service.create_file(db, file)


@router.post("/upload", response_model=MarkdownResponse, status_code=status.HTTP_201_CREATED)
async def upload_markdown_file(
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a markdown file - Admin only."""
    if not file.filename.endswith('.md'):
        raise HTTPException(status_code=400, detail="Only .md files are allowed")
    
    content = await file.read()
    content_str = content.decode('utf-8')
    
    filename = file.filename[:-3]
    slug = re.sub(r'[^a-z0-9]+', '-', filename.lower()).strip('-')
    
    existing_file = markdown_service.get_file_by_slug(db, slug, folder_id, active_only=False)
    if existing_file:

        counter = 1
        while existing_file:
            new_slug = f"{slug}-{counter}"
            existing_file = markdown_service.get_file_by_slug(db, new_slug, folder_id, active_only=False)
            if not existing_file:
                slug = new_slug
                break
            counter += 1
    
    file_data = MarkdownCreate(
        title=filename,
        content=content_str,
        slug=slug,
        folder_id=folder_id
    )
    
    return markdown_service.create_file(db, file_data)


@router.put("/{file_id}", response_model=MarkdownResponse)
async def update_file(
    file_id: int,
    file_update: MarkdownUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing markdown file - Admin only."""
    db_file = markdown_service.get_file_by_id(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if file_update.slug:
        folder_id = file_update.folder_id if file_update.folder_id is not None else db_file.folder_id
        existing_file = markdown_service.get_file_by_slug(db, file_update.slug, folder_id, active_only=False)
        if existing_file and existing_file.id != file_id:
            raise HTTPException(status_code=400, detail="Slug already exists")
    
    updated_file = markdown_service.update_file(db, file_id, file_update)
    return updated_file


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hard delete a markdown file - Admin only."""
    success = markdown_service.delete_file(db, file_id)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return None


@router.patch("/{file_id}/archive", response_model=MarkdownResponse)
async def toggle_archive_status(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle archive status of a markdown file - Admin only."""
    db_file = markdown_service.toggle_archive(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    return db_file


@router.get("/download/{file_id}/markdown")
async def download_markdown(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download a markdown file as .md - Admin only."""
    db_file = markdown_service.get_file_by_id(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    content_bytes, filename = download_service.generate_markdown_file(db_file)
    
    return StreamingResponse(
        content_bytes,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/download/{file_id}/pdf")
async def download_pdf(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download a markdown file as PDF - Admin only."""
    db_file = markdown_service.get_file_by_id(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    content_bytes, filename = download_service.generate_pdf_file(db_file)
    
    return StreamingResponse(
        content_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
