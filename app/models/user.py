from sqlalchemy import Column, Integer, String, Boolean
from app.db.database import Base


class User(Base):
    """User model for authentication."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<User(username='{self.username}')>"
