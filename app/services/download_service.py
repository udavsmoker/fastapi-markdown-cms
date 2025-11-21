from io import BytesIO
from typing import Optional
import markdown
from weasyprint import HTML, CSS
from sqlalchemy.orm import Session
from app.models.markdown import MarkdownFile


def generate_markdown_file(file: MarkdownFile) -> tuple[BytesIO, str]:
    """
    Generate a downloadable markdown file.
    Returns a tuple of (file_content, filename).
    """
    content_bytes = BytesIO(file.content.encode('utf-8'))
    filename = f"{file.slug}.md"
    return content_bytes, filename


def generate_pdf_file(file: MarkdownFile) -> tuple[BytesIO, str]:
    """
    Generate a PDF from markdown content.
    Returns a tuple of (file_content, filename).
    """
    # Convert markdown to HTML
    md = markdown.Markdown(extensions=['extra', 'codehilite', 'tables', 'fenced_code'])
    html_content = md.convert(file.content)
    
    # Create a complete HTML document with styling
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{file.title}</title>
        <style>
            @page {{
                size: A4;
                margin: 2cm;
            }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 100%;
            }}
            h1, h2, h3, h4, h5, h6 {{
                margin-top: 1.5em;
                margin-bottom: 0.5em;
                font-weight: 600;
                line-height: 1.25;
            }}
            h1 {{
                font-size: 2em;
                border-bottom: 2px solid #eee;
                padding-bottom: 0.3em;
            }}
            h2 {{
                font-size: 1.5em;
                border-bottom: 1px solid #eee;
                padding-bottom: 0.3em;
            }}
            h3 {{ font-size: 1.25em; }}
            h4 {{ font-size: 1em; }}
            p {{
                margin-bottom: 1em;
            }}
            code {{
                background-color: #f6f8fa;
                padding: 0.2em 0.4em;
                border-radius: 3px;
                font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
                font-size: 85%;
            }}
            pre {{
                background-color: #f6f8fa;
                padding: 16px;
                overflow: auto;
                border-radius: 6px;
                margin-bottom: 1em;
            }}
            pre code {{
                background-color: transparent;
                padding: 0;
            }}
            blockquote {{
                border-left: 4px solid #ddd;
                padding-left: 1em;
                margin-left: 0;
                color: #666;
            }}
            table {{
                border-collapse: collapse;
                width: 100%;
                margin-bottom: 1em;
            }}
            th, td {{
                border: 1px solid #ddd;
                padding: 8px 12px;
                text-align: left;
            }}
            th {{
                background-color: #f6f8fa;
                font-weight: 600;
            }}
            a {{
                color: #0366d6;
                text-decoration: none;
            }}
            img {{
                max-width: 100%;
                height: auto;
            }}
            .header {{
                margin-bottom: 2em;
                padding-bottom: 1em;
                border-bottom: 3px solid #0366d6;
            }}
            .header h1 {{
                margin-top: 0;
                border-bottom: none;
            }}
            .metadata {{
                color: #666;
                font-size: 0.9em;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>{file.title}</h1>
            <div class="metadata">
                Created: {file.created_at.strftime('%B %d, %Y')}
                {f" | Updated: {file.updated_at.strftime('%B %d, %Y')}" if file.updated_at != file.created_at else ""}
            </div>
        </div>
        {html_content}
    </body>
    </html>
    """
    
    # Generate PDF
    pdf_bytes = BytesIO()
    HTML(string=full_html).write_pdf(pdf_bytes)
    pdf_bytes.seek(0)
    
    filename = f"{file.slug}.pdf"
    return pdf_bytes, filename
