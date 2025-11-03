#!/usr/bin/env python3
"""Script to create the first admin user."""

import sys
from getpass import getpass
from app.db.database import SessionLocal, init_db
from app.services.auth_service import create_user, get_user_by_username
from app.schemas.user import UserCreate


def create_admin():
    """Create an admin user."""
    print("=" * 50)
    print("FastAPI Markdown CMS - Admin User Creation")
    print("=" * 50)
    print()
    
    # Initialize database
    print("Initializing database...")
    init_db()
    print("✓ Database initialized")
    print()
    
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing_admin = get_user_by_username(db, "admin")
        if existing_admin:
            print("⚠️  An admin user already exists!")
            response = input("Do you want to create another admin user? (y/n): ")
            if response.lower() != 'y':
                print("Exiting...")
                return
        
        # Get username
        while True:
            username = input("\nEnter admin username (min 3 characters): ").strip()
            if len(username) < 3:
                print("❌ Username must be at least 3 characters long")
                continue
            
            # Check if username exists
            if get_user_by_username(db, username):
                print(f"❌ Username '{username}' already exists")
                continue
            
            break
        
        # Get password
        while True:
            password = getpass("Enter admin password (min 6 characters): ")
            if len(password) < 6:
                print("❌ Password must be at least 6 characters long")
                continue
            
            password_confirm = getpass("Confirm password: ")
            if password != password_confirm:
                print("❌ Passwords do not match")
                continue
            
            break
        
        # Create user
        print("\nCreating admin user...")
        user_data = UserCreate(username=username, password=password)
        user = create_user(db, user_data)
        
        print()
        print("=" * 50)
        print("✓ Admin user created successfully!")
        print("=" * 50)
        print(f"\nUsername: {user.username}")
        print(f"User ID: {user.id}")
        print("\nYou can now login at: http://localhost:8000/admin/login")
        print()
        
    except Exception as e:
        print(f"\n❌ Error creating admin user: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
