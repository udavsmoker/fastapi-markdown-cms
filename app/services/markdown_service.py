from sqlalchemy.orm import Session, joinedload
from typing import Optional
from app.models.markdown import MarkdownFile, FileStatus
from app.schemas.markdown import MarkdownCreate, MarkdownUpdate


def get_file_by_id(db: Session, file_id: int) -> Optional[MarkdownFile]:
    """Get markdown file by ID."""
    return db.query(MarkdownFile).options(joinedload(MarkdownFile.folder)).filter(MarkdownFile.id == file_id).first()


def get_file_by_slug(db: Session, slug: str, folder_id: Optional[int] = None, active_only: bool = True) -> Optional[MarkdownFile]:
    """Get markdown file by slug within a folder."""
    query = db.query(MarkdownFile).options(joinedload(MarkdownFile.folder)).filter(MarkdownFile.slug == slug)
    
    # Filter by folder
    if folder_id is not None:
        query = query.filter(MarkdownFile.folder_id == folder_id)
    else:
        query = query.filter(MarkdownFile.folder_id == None)
    
    if active_only:
        query = query.filter(MarkdownFile.status == FileStatus.ACTIVE)
    return query.first()


def get_all_files(db: Session, include_archived: bool = False) -> list[MarkdownFile]:
    """Get all markdown files."""
    query = db.query(MarkdownFile).options(joinedload(MarkdownFile.folder))
    if not include_archived:
        query = query.filter(MarkdownFile.status == FileStatus.ACTIVE)
    return query.order_by(MarkdownFile.created_at.desc()).all()


def create_file(db: Session, file: MarkdownCreate) -> MarkdownFile:
    """Create a new markdown file."""
    db_file = MarkdownFile(
        title=file.title,
        content=file.content,
        slug=file.slug,
        folder_id=file.folder_id,
        status=FileStatus.ACTIVE
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


def update_file(db: Session, file_id: int, file_update: MarkdownUpdate) -> MarkdownFile | None:
    """Update an existing markdown file."""
    db_file = get_file_by_id(db, file_id)
    if not db_file:
        return None
    
    update_data = file_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_file, field, value)
    
    db.commit()
    db.refresh(db_file)
    return db_file


def delete_file(db: Session, file_id: int) -> bool:
    """Hard delete a markdown file."""
    db_file = get_file_by_id(db, file_id)
    if not db_file:
        return False
    
    db.delete(db_file)
    db.commit()
    return True


def toggle_archive(db: Session, file_id: int) -> MarkdownFile | None:
    """Toggle archive status of a markdown file."""
    db_file = get_file_by_id(db, file_id)
    if not db_file:
        return None
    
    if db_file.status == FileStatus.ACTIVE:
        db_file.status = FileStatus.ARCHIVED
    else:
        db_file.status = FileStatus.ACTIVE
    
    db.commit()
    db.refresh(db_file)
    return db_file
