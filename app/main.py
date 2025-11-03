"""Main FastAPI application."""
from fastapi import FastAPI, Request, Depends, Form, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from sqlalchemy.orm import Session
import markdown

from app.db.database import get_db, init_db
from app.core.config import get_settings
from app.routers import auth, admin, public, folders
from app.services import auth_service, markdown_service
from app.dependencies import get_current_user
from app.models.user import User

settings = get_settings()

# Create FastAPI app with docs_url and redoc_url disabled (we'll add auth)
app = FastAPI(
    title=settings.APP_NAME,
    description="A markdown content management system with admin authentication",
    version="1.0.0",
    docs_url=None,  # Disable default docs
    redoc_url=None  # Disable default redoc
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup Jinja2 templates
templates = Jinja2Templates(directory="app/templates")

# Include API routers
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(admin.router)
app.include_router(folders.router)
app.include_router(public.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()


# Web routes for serving HTML pages

@app.get("/", response_class=HTMLResponse)
async def home(request: Request, db: Session = Depends(get_db)):
    """Home page showing all active files organized by folders."""
    from app.services import folder_service
    
    files = markdown_service.get_all_files(db, include_archived=False)
    folders = folder_service.get_all_folders(db, include_archived=False)
    
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "files": files, "folders": folders}
    )


@app.get("/files/{slug}", response_class=HTMLResponse)
async def view_file(request: Request, slug: str, db: Session = Depends(get_db)):
    """View a single markdown file by slug."""
    file = markdown_service.get_file_by_slug(db, slug, active_only=True)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Convert markdown to HTML
    md = markdown.Markdown(extensions=['extra', 'codehilite'])
    html_content = md.convert(file.content)
    
    return templates.TemplateResponse(
        "public_view.html",
        {"request": request, "file": file, "content": html_content}
    )


@app.get("/admin/login", response_class=HTMLResponse)
async def login_page(request: Request, db: Session = Depends(get_db)):
    """Admin login page. Redirects to file manager if already logged in."""
    try:
        from fastapi import Cookie
        from typing import Optional
        access_token: Optional[str] = request.cookies.get("access_token")
        if access_token:
            from app.core.security import verify_token
            username = verify_token(access_token)
            if username:
                return RedirectResponse(url="/admin/files", status_code=303)
    except:
        pass
    
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/admin/login")
async def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Handle login form submission."""
    user = auth_service.authenticate_user(db, username, password)
    
    if not user:
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "Invalid username or password"},
            status_code=400
        )
    
    from datetime import timedelta
    from app.core.security import create_access_token
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    response = RedirectResponse(url="/admin/dashboard", status_code=303)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )
    return response


@app.get("/admin/logout")
async def logout():
    """Logout and redirect to home."""
    response = RedirectResponse(url="/", status_code=303)
    response.delete_cookie(key="access_token")
    return response


@app.get("/admin/dashboard", response_class=HTMLResponse)
async def admin_dashboard(
    request: Request,
    message: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin dashboard - redirects to file manager."""
    return RedirectResponse(url="/admin/files", status_code=303)


@app.get("/admin/files", response_class=HTMLResponse)
async def file_manager(
    request: Request,
    message: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """File manager page with folder support."""
    return templates.TemplateResponse(
        "file_manager.html",
        {
            "request": request,
            "message": message
        }
    )


@app.get("/admin/dashboard/old", response_class=HTMLResponse)
async def admin_dashboard_old(
    request: Request,
    message: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Old admin dashboard page (simple list view)."""
    files = markdown_service.get_all_files(db, include_archived=True)
    
    return templates.TemplateResponse(
        "admin_dashboard.html",
        {
            "request": request,
            "files": files,
            "message": message
        }
    )


@app.get("/admin/editor", response_class=HTMLResponse)
async def new_file_editor(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Editor page for creating a new file."""
    from app.services import folder_service
    folders = folder_service.get_all_folders(db, include_archived=False)
    return templates.TemplateResponse("editor.html", {
        "request": request,
        "folders": folders
    })


@app.get("/admin/editor/{file_id}", response_class=HTMLResponse)
async def edit_file_editor(
    request: Request,
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Editor page for editing an existing file."""
    from app.services import folder_service
    file = markdown_service.get_file_by_id(db, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    folders = folder_service.get_all_folders(db, include_archived=False)
    return templates.TemplateResponse(
        "editor.html",
        {"request": request, "file": file, "folders": folders}
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Protected API documentation endpoints
@app.get("/docs", include_in_schema=False)
async def get_documentation(current_user: User = Depends(get_current_user)):
    """Swagger UI documentation - requires authentication."""
    return get_swagger_ui_html(openapi_url="/openapi.json", title="API Documentation")


@app.get("/redoc", include_in_schema=False)
async def get_redoc(current_user: User = Depends(get_current_user)):
    """ReDoc documentation - requires authentication."""
    return get_redoc_html(openapi_url="/openapi.json", title="API Documentation")


@app.get("/openapi.json", include_in_schema=False)
async def openapi(current_user: User = Depends(get_current_user)):
    """OpenAPI schema - requires authentication."""
    return get_openapi(title=app.title, version=app.version, routes=app.routes)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
