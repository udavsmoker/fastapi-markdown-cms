import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import { ArrowLeft, Calendar, Edit3, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileDetail {
  id: number;
  title: string;
  content: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export default function DocumentView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<FileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token);
  }, []);

  useEffect(() => {
    document.title = file
      ? `${file.title} - FastAPI Markdown CMS`
      : 'FastAPI Markdown CMS';
  }, [file]);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/files/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setFile(data);
        } else {
          console.error('Failed to fetch file');
        }
      } catch (err) {
        console.error('Error fetching file:', err);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchFile();
  }, [slug]);

  const handleDownloadMarkdown = () => {
    if (!file) return;
    const blob = new Blob([file.content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${file.slug}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-48 bg-slate-800 rounded"></div>
          <div className="h-4 w-32 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Document Not Found</h2>
        <p className="mb-6">The requested document slug does not exist.</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="mr-2 size-4" /> Back Home
        </Button>
      </div>
    );
  }

  // Parse markdown content to html
  const htmlContent = marked.parse(file.content) as string;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 py-12 px-6 no-print-bg">
      <div className="max-w-5xl mx-auto">
        {/* Navigation & Actions Header */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800 print:hidden">
          <Button onClick={() => navigate(-1)} variant="ghost" className="hover:bg-white/5 text-slate-400 hover:text-white">
            <ArrowLeft className="mr-2 size-4" /> Back
          </Button>

          <div className="flex gap-2">
            <Button onClick={handleDownloadMarkdown} variant="outline" className="border-slate-800 hover:bg-white/5 text-slate-300">
              <Download className="mr-2 size-4" /> MD
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline" className="border-slate-800 hover:bg-white/5 text-slate-300">
              <Printer className="mr-2 size-4" /> PDF
            </Button>
            {isLoggedIn && (
              <Button onClick={() => navigate(`/admin/editor/${file.id}`)} variant="outline" className="border-slate-800 hover:bg-white/5">
                <Edit3 className="mr-2 size-4" /> Edit File
              </Button>
            )}
          </div>
        </div>

        {/* Article Metadata */}
        <header className="mb-10 print:mt-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent print:text-black print:bg-none">
            {file.title}
          </h1>
          <div className="flex items-center gap-2 text-slate-500 text-sm print:text-slate-600">
            <Calendar className="size-4" />
            <span>Published on {new Date(file.created_at).toLocaleDateString()}</span>
          </div>
        </header>

        {/* Markdown Content Container */}
        <article className="prose prose-invert prose-violet max-w-none bg-slate-900/40 backdrop-blur-md border border-slate-850 p-8 rounded-2xl shadow-xl print:bg-transparent print:border-none print:shadow-none print:p-0">
          <div 
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />
        </article>
      </div>

      {/* Styled Markdown Styles */}
      <style>{`
        .markdown-body {
          line-height: 1.75;
          font-size: 1.05rem;
          color: #cbd5e1;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
          color: #f8fafc;
          font-weight: 700;
          margin-top: 1.8em;
          margin-bottom: 0.6em;
        }
        .markdown-body h1 { font-size: 2rem; border-b: 1px solid #1e293b; padding-bottom: 0.3em; }
        .markdown-body h2 { font-size: 1.5rem; }
        .markdown-body h3 { font-size: 1.25rem; }
        .markdown-body a {
          color: #a78bfa;
          text-decoration: underline;
          text-underline-offset: 4px;
          text-decoration-color: rgba(167, 139, 250, 0.4);
          transition: all 0.2s ease;
        }
        .markdown-body a:hover {
          color: #c4b5fd;
          text-decoration-color: #c4b5fd;
        }
        .markdown-body p { margin-bottom: 1rem; }
        .markdown-body ul, .markdown-body ol { 
          margin-left: 1.2em; 
          margin-bottom: 1rem; 
          list-style-type: disc; 
        }
        .markdown-body ol { list-style-type: decimal; }
        .markdown-body li { 
          margin-bottom: 0.15em; 
          line-height: 1.6;
        }
        .markdown-body li > p {
          margin-bottom: 0.15em;
        }
        .markdown-body pre {
          background-color: #0f172a;
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1.2rem 0;
          border: 1px solid #1e293b;
        }
        .markdown-body code {
          background-color: #1e293b;
          color: #f472b6;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.9em;
        }
        .markdown-body pre code {
          background-color: transparent;
          color: inherit;
          padding: 0;
        }
        .markdown-body blockquote {
          border-left: 4px solid #7c3aed;
          padding-left: 1.2rem;
          color: #94a3b8;
          font-style: italic;
          margin: 1.5em 0;
        }
        .markdown-body img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1.5em 0;
        }
        .markdown-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5em 0;
        }
        .markdown-body th, .markdown-body td {
          border: 1px solid #1e293b;
          padding: 0.75rem;
          text-align: left;
        }
        .markdown-body th {
          background-color: #0f172a;
          color: #f8fafc;
        }

        @media print {
          body, .no-print-bg {
            background: white !important;
            color: black !important;
          }
          header h1 {
            color: black !important;
            background: none !important;
            -webkit-text-fill-color: initial !important;
          }
          .markdown-body {
            color: black !important;
          }
          .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
            color: black !important;
          }
          .markdown-body code {
            background-color: #f1f5f9 !important;
            color: #db2777 !important;
            border: 1px solid #e2e8f0 !important;
          }
          .markdown-body pre {
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
          }
          .markdown-body pre code {
            color: black !important;
            background-color: transparent !important;
          }
          .markdown-body blockquote {
            border-left-color: #7c3aed !important;
            color: #475569 !important;
          }
        }
      `}</style>
    </div>
  );
}
