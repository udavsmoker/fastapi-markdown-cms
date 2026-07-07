# FastAPI Markdown CMS

<img width="1904" height="1000" alt="example" src="https://github.com/user-attachments/assets/d4b7b4e4-0acf-4b13-a548-72a0f98f9c0d" />


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

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Install Node.js dependencies for the React frontend:
   ```bash
   cd frontend
   npm install
   cd ..
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

For production, first build the React frontend:
```bash
cd frontend
npm run build
cd ..
```

Then start the FastAPI server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The application will be available at http://localhost:8000

For development (hot-reloading):
1. Terminal 1 (Backend): `uvicorn app.main:app --reload --port 8000`
2. Terminal 2 (Frontend): `cd frontend && npm run dev`
(Access via Vite's port, usually http://localhost:5173)

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
│   └── services/
│       ├── auth_service.py    # Authentication logic
│       ├── markdown_service.py # File CRUD logic
│       └── folder_service.py  # Folder CRUD logic
├── frontend/                   # React SPA (Vite, Tailwind, Framer Motion)
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── pages/             # Page views (Dashboard, Editor, Home)
│   │   └── App.tsx            # React router
│   ├── package.json
│   └── vite.config.ts
├── .env                        # Environment variables
├── .gitignore
├── requirements.txt
├── create_admin.py            # Admin user creation script
├── migrate_db.py              # Database migration script
└── README.md
```


## License

MIT
