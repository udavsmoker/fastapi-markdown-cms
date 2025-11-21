from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.markdown import MarkdownResponse, MarkdownList
from app.services import markdown_service, folder_service, download_service

router = APIRouter(prefix="/files", tags=["public"])


@router.get("", response_model=list[MarkdownList])
async def list_active_files(db: Session = Depends(get_db)):
    """List all active markdown files - Public access."""
    files = markdown_service.get_all_files(db, include_archived=False)
    return files


@router.get("/download/{file_id}/markdown")
async def download_markdown(file_id: int, db: Session = Depends(get_db)):
    """Download a markdown file as .md"""
    db_file = markdown_service.get_file_by_id(db, file_id)
    if not db_file or db_file.status.value != "active":
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
async def download_pdf(file_id: int, db: Session = Depends(get_db)):
    """Download a markdown file as PDF"""
    db_file = markdown_service.get_file_by_id(db, file_id)
    if not db_file or db_file.status.value != "active":
        raise HTTPException(status_code=404, detail="File not found")
    
    content_bytes, filename = download_service.generate_pdf_file(db_file)
    
    return StreamingResponse(
        content_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/{file_path:path}", response_model=MarkdownResponse)
async def get_file_by_path(file_path: str, db: Session = Depends(get_db)):

    # Split the path into parts
    parts = file_path.strip('/').split('/')
    
    if len(parts) == 0:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Last part is the file slug
    file_slug = parts[-1]
    folder_path = parts[:-1] if len(parts) > 1 else []
    
    # If no folder path, search in root
    if not folder_path:
        db_file = markdown_service.get_file_by_slug(db, file_slug, folder_id=None, active_only=True)
    else:
        # Navigate through folder hierarchy
        current_folder = None
        for folder_slug in folder_path:
            if current_folder is None:
                # Looking for root folder
                folder = folder_service.get_folder_by_slug(db, folder_slug)
                if not folder or folder.parent_id is not None:
                    raise HTTPException(status_code=404, detail=f"Folder '{folder_slug}' not found")
                current_folder = folder
            else:
                # Looking for subfolder
                found = False
                for subfolder in current_folder.subfolders:
                    if subfolder.slug == folder_slug:
                        current_folder = subfolder
                        found = True
                        break
                if not found:
                    raise HTTPException(status_code=404, detail=f"Folder '{folder_slug}' not found")
        
        # Now search for file in the final folder
        db_file = markdown_service.get_file_by_slug(db, file_slug, folder_id=current_folder.id, active_only=True)
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    return db_file
