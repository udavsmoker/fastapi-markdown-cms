from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum


class FileStatus(str, enum.Enum):
    """Status enum for markdown files."""
    ACTIVE = "active"
    ARCHIVED = "archived"


class Folder(Base):
    """Folder model for organizing markdown files."""
    
    __tablename__ = "folders"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    parent_id = Column(Integer, ForeignKey('folders.id'), nullable=True)
    status = Column(SQLEnum(FileStatus), default=FileStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    parent = relationship("Folder", remote_side=[id], backref="subfolders")
    files = relationship("MarkdownFile", back_populates="folder", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Folder(name='{self.name}', slug='{self.slug}')>"


class MarkdownFile(Base):
    """MarkdownFile model for content management."""
    
    __tablename__ = "markdown_files"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    slug = Column(String, index=True, nullable=False)
    folder_id = Column(Integer, ForeignKey('folders.id'), nullable=True)
    status = Column(SQLEnum(FileStatus), default=FileStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    folder = relationship("Folder", back_populates="files")
    
    def __repr__(self):
        return f"<MarkdownFile(title='{self.title}', slug='{self.slug}', status='{self.status}')>"
