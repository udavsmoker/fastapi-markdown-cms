# FastAPI Markdown CMS

A modern content management system built with FastAPI for managing markdown files with admin authentication.

## Features

-  **Folder Management** - Organize files in folders and subfolders
-  **File Upload** - Upload ready-to-go .md files directly
-  Full CRUD operations for markdown files
-  Integrated markdown editor (SimpleMDE)
-  Responsive web interface
-  SQLite database with SQLAlchemy ORM
-  Public read-only access to active content
-  **Archive folders or individual files** (soft delete)

## Installation

1. Clone the repository
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Generate a secure secret key and update `.env`:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   Copy the output and replace `SECRET_KEY` in `.env`

5. Initialize the database and create the first admin user:
   ```bash
   python create_admin.py
   ```

## Running the Application

Start the development server:
```bash
uvicorn app.main:app --reload
```

The application will be available at http://localhost:8000

## Project Structure

```
homeserver/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app initialization
│   ├── dependencies.py         # Shared dependencies (auth, etc.)
│   ├── core/
│   │   ├── config.py          # Environment configuration
│   │   └── security.py        # Password hashing, JWT
│   ├── db/
│   │   └── database.py        # Database connection
│   ├── models/
│   │   ├── user.py            # User model
│   │   └── markdown.py        # MarkdownFile & Folder models
│   ├── schemas/
│   │   ├── user.py            # User Pydantic schemas
│   │   └── markdown.py        # File & Folder schemas
│   ├── routers/
│   │   ├── auth.py            # Authentication endpoints
│   │   ├── admin.py           # Admin file management
│   │   ├── folders.py         # Folder management
│   │   └── public.py          # Public read-only routes
│   ├── services/
│   │   ├── auth_service.py    # Authentication logic
│   │   ├── markdown_service.py # File CRUD logic
│   │   └── folder_service.py  # Folder CRUD logic
│   └── templates/
│       ├── base.html          # Base template
│       ├── login.html         # Login page
│       ├── file_manager.html  # File & folder manager
│       ├── editor.html        # Markdown editor
│       ├── index.html         # Public homepage
│       └── public_view.html   # Individual file view
├── static/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── editor.js
│   └── favicon.ico
├── .env                        # Environment variables
├── .gitignore
├── requirements.txt
├── create_admin.py            # Admin user creation script
├── migrate_db.py              # Database migration script
└── README.md
```

## Development

For development, enable auto-reload:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## License

MIT
