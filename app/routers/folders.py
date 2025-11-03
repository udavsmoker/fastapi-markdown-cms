from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.markdown import Folder
from app.schemas.markdown import FolderCreate, FolderUpdate, FolderResponse
from app.services import folder_service

router = APIRouter(prefix="/api/admin/folders", tags=["admin-folders"])


@router.post("/", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    folder: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new folder."""
    # Check if slug already exists
    existing = folder_service.get_folder_by_slug(db, folder.slug)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder with this slug already exists"
        )
    
    return folder_service.create_folder(db, folder)


@router.get("/", response_model=List[FolderResponse])
async def list_folders(
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all folders."""
    return folder_service.get_all_folders(db, include_archived=include_archived)


@router.get("/root", response_model=List[FolderResponse])
async def list_root_folders(
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all root folders (folders without a parent)."""
    return folder_service.get_root_folders(db, include_archived=include_archived)


@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a folder by ID."""
    folder = folder_service.get_folder(db, folder_id)
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    return folder


@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: int,
    folder_update: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a folder."""
    folder = folder_service.update_folder(db, folder_id, folder_update)
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a folder."""
    success = folder_service.delete_folder(db, folder_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    return None


@router.patch("/{folder_id}/archive", response_model=FolderResponse)
async def toggle_archive_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle archive status of a folder and all its contents."""
    folder = folder_service.toggle_archive_folder(db, folder_id)
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    return folder
