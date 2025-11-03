from pydantic import BaseModel, Field


class UserBase(BaseModel):
    """Base user schema."""
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str = Field(..., min_length=6)


class UserInDB(UserBase):
    """Schema for user in database."""
    id: int
    hashed_password: str
    is_admin: bool
    
    class Config:
        from_attributes = True


class User(UserBase):
    """Schema for user response."""
    id: int
    is_admin: bool
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Schema for token data."""
    username: str | None = None
