"""Image upload API router for clipboard paste support."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
import uuid
import os
from datetime import datetime

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.core.config import get_settings

router = APIRouter(prefix="/api/admin/images", tags=["images"])
settings = get_settings()

# Allowed image MIME types
ALLOWED_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


def ensure_upload_dir():
    """Ensure the upload directory exists."""
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload an image file (for clipboard paste support).
    Returns the URL to access the uploaded image.
    """
    # Validate content type
    content_type = file.content_type
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_TYPES.keys())}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > settings.MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.MAX_IMAGE_SIZE // 1024 // 1024}MB"
        )
    
    # Generate unique filename
    extension = ALLOWED_TYPES[content_type]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{timestamp}_{unique_id}{extension}"
    
    # Save file
    upload_dir = ensure_upload_dir()
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Return the URL to access the image
    image_url = f"/uploads/{filename}"
    
    return {
        "url": image_url,
        "filename": filename,
        "size": len(content),
        "content_type": content_type
    }


@router.delete("/{filename}")
async def delete_image(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an uploaded image."""
    # Security: prevent path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    upload_dir = Path(settings.UPLOAD_DIR)
    file_path = upload_dir / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    os.remove(file_path)
    return {"message": "Image deleted successfully"}
