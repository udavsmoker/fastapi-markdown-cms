from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.markdown import Folder, FileStatus
from app.schemas.markdown import FolderCreate, FolderUpdate


def create_folder(db: Session, folder: FolderCreate) -> Folder:
    """Create a new folder."""
    db_folder = Folder(**folder.model_dump())
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder


def get_folder(db: Session, folder_id: int) -> Optional[Folder]:
    """Get a folder by ID."""
    return db.query(Folder).filter(Folder.id == folder_id).first()


def get_folder_by_slug(db: Session, slug: str) -> Optional[Folder]:
    """Get a folder by slug."""
    return db.query(Folder).filter(Folder.slug == slug).first()


def get_all_folders(db: Session, include_archived: bool = False) -> List[Folder]:
    """Get all folders."""
    query = db.query(Folder)
    if not include_archived:
        query = query.filter(Folder.status == FileStatus.ACTIVE)
    return query.order_by(Folder.name).all()


def get_root_folders(db: Session, include_archived: bool = False) -> List[Folder]:
    """Get all root folders (folders without a parent)."""
    query = db.query(Folder).filter(Folder.parent_id == None)
    if not include_archived:
        query = query.filter(Folder.status == FileStatus.ACTIVE)
    return query.order_by(Folder.name).all()


def update_folder(db: Session, folder_id: int, folder_update: FolderUpdate) -> Optional[Folder]:
    """Update a folder."""
    db_folder = get_folder(db, folder_id)
    if not db_folder:
        return None
    
    update_data = folder_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_folder, field, value)
    
    db.commit()
    db.refresh(db_folder)
    return db_folder


def delete_folder(db: Session, folder_id: int) -> bool:
    """Delete a folder and all its files."""
    db_folder = get_folder(db, folder_id)
    if not db_folder:
        return False
    
    db.delete(db_folder)
    db.commit()
    return True


def toggle_archive_folder(db: Session, folder_id: int) -> Optional[Folder]:
    """Toggle archive status of a folder and all its files."""
    db_folder = get_folder(db, folder_id)
    if not db_folder:
        return None
    
    # Toggle folder status
    new_status = FileStatus.ARCHIVED if db_folder.status == FileStatus.ACTIVE else FileStatus.ACTIVE
    db_folder.status = new_status
    
    # Toggle status of all files in the folder
    for file in db_folder.files:
        file.status = new_status
    
    # Recursively toggle subfolders
    for subfolder in db_folder.subfolders:
        toggle_archive_folder(db, subfolder.id)
    
    db.commit()
    db.refresh(db_folder)
    return db_folder
