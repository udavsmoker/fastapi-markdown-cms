from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.markdown import MarkdownResponse, MarkdownList
from app.services import markdown_service

router = APIRouter(prefix="/files", tags=["public"])


@router.get("", response_model=list[MarkdownList])
async def list_active_files(db: Session = Depends(get_db)):
    """List all active markdown files - Public access."""
    files = markdown_service.get_all_files(db, include_archived=False)
    return files


@router.get("/{slug}", response_model=MarkdownResponse)
async def get_file_by_slug(slug: str, db: Session = Depends(get_db)):
    """Get a specific markdown file by slug - Public access."""
    db_file = markdown_service.get_file_by_slug(db, slug, active_only=True)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    return db_file
