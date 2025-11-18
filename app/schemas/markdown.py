from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List
from app.models.markdown import FileStatus


class FolderBase(BaseModel):
    """Base folder schema."""
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200, pattern=r'^[a-z0-9-]+$')
    parent_id: Optional[int] = None


class FolderCreate(FolderBase):
    """Schema for creating a folder."""
    pass


class FolderUpdate(BaseModel):
    """Schema for updating a folder."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    slug: Optional[str] = Field(None, min_length=1, max_length=200, pattern=r'^[a-z0-9-]+$')
    parent_id: Optional[int] = None
    status: Optional[FileStatus] = None


class FolderResponse(FolderBase):
    """Schema for folder response."""
    id: int
    status: FileStatus
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MarkdownBase(BaseModel):
    """Base markdown schema."""
    title: str = Field(..., min_length=1, max_length=200)
    content: str
    slug: str = Field(..., min_length=1, max_length=200, pattern=r'^[a-z0-9-]+$')
    folder_id: Optional[int] = None


class MarkdownCreate(MarkdownBase):
    """Schema for creating a markdown file."""
    pass


class MarkdownUpdate(BaseModel):
    """Schema for updating a markdown file."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None
    slug: Optional[str] = Field(None, min_length=1, max_length=200, pattern=r'^[a-z0-9-]+$')
    folder_id: Optional[int] = None
    status: Optional[FileStatus] = None


class MarkdownResponse(MarkdownBase):
    """Schema for markdown file response."""
    id: int
    status: FileStatus
    folder: Optional[FolderResponse] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
    
    def get_full_path(self) -> str:
        """Get the full path including folder hierarchy."""
        if not self.folder:
            return self.slug
        
        return f"{self.folder.slug}/{self.slug}"


class MarkdownList(BaseModel):
    """Schema for markdown file list item."""
    id: int
    title: str
    slug: str
    folder_id: Optional[int] = None
    folder: Optional[FolderResponse] = None
    status: FileStatus
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
    
    def get_full_path(self) -> str:
        """Get the full path including folder hierarchy."""
        if not self.folder:
            return self.slug
        return f"{self.folder.slug}/{self.slug}"
