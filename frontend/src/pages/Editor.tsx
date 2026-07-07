import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import {
  ArrowLeft, Save, Eye, Edit2, Zap,
  Bold, Italic, Heading1, Heading2, Heading3,
  Code, List, ListOrdered, Quote, Link, Minus,
  Table, AlignLeft, Download, Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PixelTransition from '@/components/ui/PixelTransition';

interface FolderItem {
  id: number;
  name: string;
}

type EditorMode = 'simple' | 'advanced';
type ActiveTab = 'edit' | 'preview' | 'split';

// ── Toolbar action definition ─────────────────────────────────────────────────
interface ToolbarAction {
  icon: React.ReactNode;
  label: string;
  action: (selected: string, full: string, selStart: number, selEnd: number) => {
    value: string;
    cursorStart: number;
    cursorEnd: number;
  };
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    icon: <Bold className="size-4" />, label: 'Bold',
    action: (sel) => sel
      ? { value: `**${sel}**`, cursorStart: 2, cursorEnd: sel.length + 2 }
      : { value: `**bold text**`, cursorStart: 2, cursorEnd: 11 },
  },
  {
    icon: <Italic className="size-4" />, label: 'Italic',
    action: (sel) => sel
      ? { value: `_${sel}_`, cursorStart: 1, cursorEnd: sel.length + 1 }
      : { value: `_italic text_`, cursorStart: 1, cursorEnd: 12 },
  },
  {
    icon: <Heading1 className="size-4" />, label: 'H1',
    action: (sel) => ({ value: `# ${sel || 'Heading 1'}`, cursorStart: 2, cursorEnd: 2 + (sel || 'Heading 1').length }),
  },
  {
    icon: <Heading2 className="size-4" />, label: 'H2',
    action: (sel) => ({ value: `## ${sel || 'Heading 2'}`, cursorStart: 3, cursorEnd: 3 + (sel || 'Heading 2').length }),
  },
  {
    icon: <Heading3 className="size-4" />, label: 'H3',
    action: (sel) => ({ value: `### ${sel || 'Heading 3'}`, cursorStart: 4, cursorEnd: 4 + (sel || 'Heading 3').length }),
  },
  {
    icon: <Code className="size-4" />, label: 'Code',
    action: (sel) => sel
      ? { value: `\`${sel}\``, cursorStart: 1, cursorEnd: sel.length + 1 }
      : { value: '`code`', cursorStart: 1, cursorEnd: 5 },
  },
  {
    icon: <AlignLeft className="size-4" />, label: 'Code Block',
    action: (sel) => ({
      value: `\`\`\`\n${sel || 'code here'}\n\`\`\``,
      cursorStart: 4,
      cursorEnd: 4 + (sel || 'code here').length,
    }),
  },
  {
    icon: <List className="size-4" />, label: 'Bullet List',
    action: (sel) => {
      const lines = (sel || 'List item').split('\n').map(l => `- ${l}`).join('\n');
      return { value: lines, cursorStart: 2, cursorEnd: lines.length };
    },
  },
  {
    icon: <ListOrdered className="size-4" />, label: 'Numbered List',
    action: (sel) => {
      const lines = (sel || 'List item').split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n');
      return { value: lines, cursorStart: 3, cursorEnd: lines.length };
    },
  },
  {
    icon: <Quote className="size-4" />, label: 'Blockquote',
    action: (sel) => {
      const lines = (sel || 'Quote text').split('\n').map(l => `> ${l}`).join('\n');
      return { value: lines, cursorStart: 2, cursorEnd: lines.length };
    },
  },
  {
    icon: <Link className="size-4" />, label: 'Link',
    action: (sel) => ({
      value: sel ? `[${sel}](url)` : `[link text](url)`,
      cursorStart: sel ? sel.length + 3 : 12,
      cursorEnd: sel ? sel.length + 6 : 15,
    }),
  },
  {
    icon: <Minus className="size-4" />, label: 'Divider',
    action: () => ({ value: '\n---\n', cursorStart: 5, cursorEnd: 5 }),
  },
  {
    icon: <Table className="size-4" />, label: 'Table',
    action: () => ({
      value: '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |',
      cursorStart: 2, cursorEnd: 10,
    }),
  },
];

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState<number | null>(null);

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('edit');
  const [editorMode, setEditorMode] = useState<EditorMode>('simple');
  const [loading, setLoading] = useState(false);
  const [pixelActive, setPixelActive] = useState(false);

  const [autosaveStatus, setAutosaveStatus] = useState('');
  const hasLoaded = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  });

  useEffect(() => {
    const pageTitle = title.trim() || (id ? 'Edit Document' : 'New Document');
    document.title = `${pageTitle} - FastAPI Markdown CMS`;
  }, [title, id]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) { navigate('/admin/login'); return; }

        const foldersRes = await fetch('/api/admin/folders/', { headers: getAuthHeaders() });
        if (foldersRes.status === 401) { navigate('/admin/login'); return; }
        if (foldersRes.ok) setFolders(await foldersRes.json());

        if (id) {
          setLoading(true);
          const fileRes = await fetch(`/api/admin/files/${id}`, { headers: getAuthHeaders() });
          if (fileRes.ok) {
            const d = await fileRes.json();
            setTitle(d.title);
            setSlug(d.slug);
            setContent(d.content);
            setFolderId(d.folder_id);
          }
        } else {
          // Check for localStorage draft for new unsaved files
          const savedDraft = localStorage.getItem('markdown_cms_new_draft');
          if (savedDraft) {
            try {
              const draft = JSON.parse(savedDraft);
              setTitle(draft.title || '');
              setSlug(draft.slug || '');
              setContent(draft.content || '');
              setFolderId(draft.folderId || null);
              setAutosaveStatus('Restored unsaved draft');
            } catch (e) {
              console.error('Error parsing draft:', e);
            }
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
        // Mark load complete so that future edits trigger autosaves
        hasLoaded.current = true;
      }
    };
    loadData();
  }, [id]);

  // Autosave Effect
  useEffect(() => {
    if (!hasLoaded.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (id) {
        setAutosaveStatus('Saving...');
        try {
          const payload = { title, slug, content, folder_id: folderId };
          const res = await fetch(`/api/admin/files/${id}`, {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const now = new Date().toLocaleTimeString();
            setAutosaveStatus(`Saved at ${now}`);
          } else {
            setAutosaveStatus('Save failed');
          }
        } catch (err) {
          console.error('Autosave error:', err);
          setAutosaveStatus('Save failed');
        }
      } else {
        // Save new unsaved draft to localStorage
        if (title.trim() || content.trim()) {
          const draft = { title, slug, content, folderId };
          localStorage.setItem('markdown_cms_new_draft', JSON.stringify(draft));
          const now = new Date().toLocaleTimeString();
          setAutosaveStatus(`Draft saved at ${now}`);
        }
      }
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, slug, content, folderId, id]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!id) setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${slug || 'document'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;
    const payload = { title, slug, content, folder_id: folderId };
    try {
      const res = await fetch(id ? `/api/admin/files/${id}` : '/api/admin/files', {
        method: id ? 'PUT' : 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (!id) {
          localStorage.removeItem('markdown_cms_new_draft');
        }
        setPixelActive(true);
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to save file');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    }
  };

  // ── Image Upload (Paste / Drop) ──────────────────────────────────────────
  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/admin/images/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: formData,
      });
      if (response.ok) {
        const result = await response.json();
        return result.url;
      }
      throw new Error('Upload failed');
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        
        const ta = e.currentTarget;
        const placeholder = `![Uploading image...](uploading)\n`;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        
        setContent(prev => prev.substring(0, start) + placeholder + prev.substring(end));
        setAutosaveStatus('Uploading image...');
        
        const url = await uploadImage(file);
        setContent(prev => {
          if (url) {
            setAutosaveStatus('Image uploaded');
            return prev.replace(placeholder, `![image](${url})\n`);
          } else {
            setAutosaveStatus('Image upload failed');
            return prev.replace(placeholder, '');
          }
        });
        break;
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    
    e.preventDefault();
    const ta = e.currentTarget;
    const placeholder = `![Uploading image...](uploading)\n`;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    
    setContent(prev => prev.substring(0, start) + placeholder + prev.substring(end));
    setAutosaveStatus('Uploading image...');
    
    const url = await uploadImage(file);
    setContent(prev => {
      if (url) {
        setAutosaveStatus('Image uploaded');
        return prev.replace(placeholder, `![image](${url})\n`);
      } else {
        setAutosaveStatus('Image upload failed');
        return prev.replace(placeholder, '');
      }
    });
  };

  // ── Toolbar insertion ──────────────────────────────────────────────────────
  const applyToolbarAction = (action: ToolbarAction) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const selStart = ta.selectionStart;
    const selEnd = ta.selectionEnd;
    const selected = content.substring(selStart, selEnd);
    const before = content.substring(0, selStart);
    const after = content.substring(selEnd);
    const result = action.action(selected, content, selStart, selEnd);
    const newContent = before + result.value + after;
    setContent(newContent);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart + result.cursorStart, selStart + result.cursorEnd);
    });
  };

  // ── Tab key inside textarea ────────────────────────────────────────────────
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current!;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = content.substring(0, start) + '  ' + content.substring(end);
      setContent(next);
      requestAnimationFrame(() => ta.setSelectionRange(start + 2, start + 2));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-500" />
      </div>
    );
  }

  const htmlContent = marked.parse(content || '*No content written yet.*') as string;

  const isAdvanced = editorMode === 'advanced';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 md:px-8 relative">
      <PixelTransition
        active={pixelActive}
        onTransitionComplete={() => navigate('/admin/files')}
        pixelColor="#7c3aed"
      />

      <div className="max-w-5xl mx-auto">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/admin/files')}
              variant="ghost"
              className="hover:bg-white/5 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 size-4" /> Back to Files
            </Button>

            <div className="flex gap-2">
              <Button type="button" onClick={handleDownloadMarkdown} variant="outline" className="border-slate-800 hover:bg-white/5 text-slate-300 text-xs py-1 h-8">
                <Download className="mr-1.5 size-3.5" /> MD
              </Button>
              <Button type="button" onClick={handleDownloadPDF} variant="outline" className="border-slate-800 hover:bg-white/5 text-slate-300 text-xs py-1 h-8">
                <Printer className="mr-1.5 size-3.5" /> PDF
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {autosaveStatus && (
              <span className="text-[11px] text-violet-400/90 font-medium tracking-wide bg-slate-900 border border-slate-800/80 px-2.5 py-1 rounded-full animate-pulse">
                {autosaveStatus}
              </span>
            )}

            {/* Mode toggle */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setEditorMode('simple')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  !isAdvanced
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit2 className="size-3" /> Simple
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('advanced')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  isAdvanced
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="size-3" /> Advanced
              </button>
            </div>

            <h2 className="text-lg font-bold text-slate-300 ml-2">
              {id ? 'Edit Document' : 'New Document'}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Metadata row ─────────────────────────────────────────── */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase block mb-2">Title</label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Project Architecture"
                  required
                  className="bg-slate-950 border-slate-700 focus-visible:ring-violet-500 text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase block mb-2">Slug (URL-friendly)</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. project-architecture"
                  required
                  pattern="^[a-z0-9-]+$"
                  className="bg-slate-950 border-slate-700 focus-visible:ring-violet-500 text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase block mb-2">Folder</label>
              <select
                value={folderId || ''}
                onChange={(e) => setFolderId(e.target.value ? parseInt(e.target.value) : null)}
                className="flex h-9 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              >
                <option value="">Root (No folder)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Editor area ──────────────────────────────────────────── */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden mb-4">
            {/* Tab bar */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 bg-slate-900/80">
              <div className="flex gap-1">
                {(['edit', 'preview', ...(isAdvanced ? ['split'] : [])] as ActiveTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                      activeTab === tab
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {tab === 'edit' && <Edit2 className="inline size-3 mr-1" />}
                    {tab === 'preview' && <Eye className="inline size-3 mr-1" />}
                    {tab}
                  </button>
                ))}
              </div>
              {isAdvanced && (
                <span className="text-xs text-slate-500">
                  {content.length} chars · {content.split(/\s+/).filter(Boolean).length} words
                </span>
              )}
            </div>

            {/* Advanced toolbar */}
            {isAdvanced && activeTab !== 'preview' && (
              <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-slate-800 bg-slate-950/60">
                {TOOLBAR_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    title={action.label}
                    onClick={() => applyToolbarAction(action)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {action.icon}
                  </button>
                ))}
              </div>
            )}

            {/* Editor body */}
            {activeTab === 'split' ? (
              // Split view (advanced only)
              <div className="grid grid-cols-2 divide-x divide-slate-800" style={{ minHeight: 420 }}>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  onPaste={handlePaste}
                  onDrop={handleDrop}
                  placeholder="Write your markdown here... Paste or drag images directly."
                  className="w-full h-full min-h-[420px] bg-transparent p-4 font-mono text-sm text-slate-300 placeholder:text-slate-700 focus:outline-none resize-none"
                />
                <div
                  className="markdown-preview p-4 overflow-y-auto"
                  style={{ minHeight: 420, maxHeight: 560 }}
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            ) : activeTab === 'edit' ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                onPaste={handlePaste}
                onDrop={handleDrop}
                placeholder="Write your markdown here... Paste or drag images directly."
                rows={isAdvanced ? 22 : 16}
                className="w-full bg-transparent p-4 font-mono text-sm text-slate-300 placeholder:text-slate-700 focus:outline-none resize-none"
              />
            ) : (
              <div
                className="markdown-preview p-6 min-h-[300px] max-h-[560px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            )}
          </div>

          {/* ── Footer actions ───────────────────────────────────────── */}
          <div className="flex gap-3">
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
              <Save className="size-4" /> Save Document
            </Button>
            <Button
              type="button"
              onClick={() => navigate('/admin/files')}
              variant="ghost"
              className="hover:bg-white/5 text-slate-400"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      <style>{`
        .markdown-preview {
          line-height: 1.75;
          font-size: 0.95rem;
          color: #cbd5e1;
        }
        .markdown-preview h1,
        .markdown-preview h2,
        .markdown-preview h3,
        .markdown-preview h4 {
          color: #f8fafc;
          font-weight: 700;
          margin-top: 1.5em;
          margin-bottom: 0.4em;
          line-height: 1.3;
        }
        .markdown-preview h1 {
          font-size: 1.7rem;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 0.3em;
        }
        .markdown-preview h2 { font-size: 1.35rem; }
        .markdown-preview h3 { font-size: 1.1rem; }
        .markdown-preview p { margin-bottom: 0.9em; }
        .markdown-preview ul,
        .markdown-preview ol { margin-left: 1.5em; margin-bottom: 0.9em; }
        .markdown-preview li { margin-bottom: 0.25em; }
        .markdown-preview a { color: #a78bfa; text-decoration: underline; }
        .markdown-preview blockquote {
          border-left: 3px solid #7c3aed;
          padding-left: 1rem;
          color: #94a3b8;
          font-style: italic;
          margin: 1em 0;
        }
        .markdown-preview pre {
          background-color: #0f172a;
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1em 0;
          border: 1px solid #1e293b;
        }
        .markdown-preview code {
          background-color: #1e293b;
          color: #f472b6;
          padding: 0.12rem 0.3rem;
          border-radius: 4px;
          font-size: 0.88em;
          font-family: 'Fira Code', monospace;
        }
        .markdown-preview pre code {
          background: none;
          color: #e2e8f0;
          padding: 0;
        }
        .markdown-preview table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
          font-size: 0.9em;
        }
        .markdown-preview th,
        .markdown-preview td {
          border: 1px solid #1e293b;
          padding: 0.5rem 0.75rem;
          text-align: left;
        }
        .markdown-preview th {
          background-color: #0f172a;
          color: #e2e8f0;
          font-weight: 600;
        }
        .markdown-preview hr {
          border: none;
          border-top: 1px solid #1e293b;
          margin: 1.5em 0;
        }

        @media print {
          body, .min-h-screen {
            background: white !important;
            color: black !important;
          }
          .max-w-5xl, form, .bg-slate-900\/50, textarea, .markdown-preview {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          button, .flex, label, select, input, .border-b, .border-slate-800, .print\:hidden {
            display: none !important;
          }
          .markdown-preview {
            display: block !important;
            visibility: visible !important;
          }
          .markdown-preview * {
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
