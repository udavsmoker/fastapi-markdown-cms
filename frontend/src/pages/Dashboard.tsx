import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Folder as FolderIcon,
  FileText,
  Upload,
  Plus,
  Trash,
  Archive,
  LogOut,
  ChevronRight,
  FolderPlus,
  Home,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import AnimatedList from '@/components/ui/AnimatedList';
import { cn } from '@/lib/utils';

interface FileItem {
  id: number;
  title: string;
  slug: string;
  created_at: string;
  updated_at: string;
  folder_id: number | null;
  status: string;
}

interface FolderItem {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  status: string;
}

// ── Simple recursive sidebar tree — no external library ──────────────────────
interface NavTreeProps {
  folders: FolderItem[];
  files: FileItem[];
  parentId: number | null;
  depth: number;
  currentFolderId: number | null;
  onSelectFolder: (id: number | null) => void;
  onSelectFile: (id: number) => void;
}

function NavTree({ folders, files, parentId, depth, currentFolderId, onSelectFolder, onSelectFile }: NavTreeProps) {
  const childFolders = folders.filter(f => f.parent_id === parentId && f.status !== 'archived');
  const childFiles = files.filter(f => f.folder_id === parentId && f.status !== 'archived');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());

  const toggleFolder = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (childFolders.length === 0 && childFiles.length === 0) return null;

  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
      {childFolders.map(folder => {
        const isExpanded = expandedIds.has(folder.id);
        const isSelected = currentFolderId === folder.id;
        return (
          <div key={folder.id}>
            <button
              onClick={() => { toggleFolder(folder.id); onSelectFolder(folder.id); }}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors mb-0.5',
                isSelected
                  ? 'bg-violet-950/60 text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <ChevronRight
                className={cn(
                  'size-3.5 shrink-0 text-slate-500 transition-transform duration-200',
                  isExpanded && 'rotate-90'
                )}
              />
              {isSelected ? <FolderOpen className="size-4 shrink-0 text-violet-400" /> : <FolderIcon className="size-4 shrink-0 text-slate-400" />}
              <span className="truncate">{folder.name}</span>
            </button>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <NavTree
                    folders={folders}
                    files={files}
                    parentId={folder.id}
                    depth={depth + 1}
                    currentFolderId={currentFolderId}
                    onSelectFolder={onSelectFolder}
                    onSelectFile={onSelectFile}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {childFiles.map(file => (
        <button
          key={file.id}
          onClick={() => onSelectFile(file.id)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left text-slate-400 hover:bg-white/5 hover:text-white transition-colors mb-0.5"
          style={{ paddingLeft: depth > 0 ? 28 : 24 }}
        >
          <FileText className="size-3.5 shrink-0" />
          <span className="truncate">{file.title}</span>
        </button>
      ))}
    </div>
  );
}


export default function Dashboard() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

  // Modals state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);

  // Auth Header helper
  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  // Check auth and fetch data
  const fetchData = async () => {
    try {
      const headers = getAuthHeaders();
      const filesRes = await fetch('/api/admin/files', { headers });
      const foldersRes = await fetch('/api/admin/folders/?include_archived=true', { headers });

      if (filesRes.status === 401 || foldersRes.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/admin/login');
        return;
      }

      if (filesRes.ok && foldersRes.ok) {
        const filesData = await filesRes.json();
        const foldersData = await foldersRes.json();
        setFiles(filesData);
        setFolders(foldersData);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    document.title = 'Files - FastAPI Markdown CMS';
  }, []);


  // CRUD API Actions
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const slug = newFolderName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      const res = await fetch('/api/admin/folders/', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newFolderName,
          slug,
          parent_id: currentFolderId
        })
      });
      if (res.ok) {
        setNewFolderName('');
        setIsFolderModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to create folder');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadFile = async () => {
    if (!uploadFileObj) return;
    const formData = new FormData();
    formData.append('file', uploadFileObj);
    if (currentFolderId) {
      formData.append('folder_id', currentFolderId.toString());
    }

    try {
      const res = await fetch('/api/admin/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });
      if (res.ok) {
        setUploadFileObj(null);
        setIsUploadModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.detail || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFile = async (id: number, title: string) => {
    if (!confirm(`Permanently delete file "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/files/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleArchiveFile = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/files/${id}/archive`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (id: number, name: string) => {
    if (!confirm(`Delete folder "${name}"? This deletes all files inside.`)) return;
    try {
      const res = await fetch(`/api/admin/folders/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setCurrentFolderId(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleArchiveFolder = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/folders/${id}/archive`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    navigate('/');
  };

  // Breadcrumbs path calculation
  const breadcrumbs = useMemo(() => {
    const crumbs: Array<{ id: number | null, name: string }> = [{ id: null, name: 'Root' }];
    if (!currentFolderId) return crumbs;

    const buildPath = (folderId: number) => {
      const f = folders.find(folder => folder.id === folderId);
      if (f) {
        if (f.parent_id) buildPath(f.parent_id);
        crumbs.push({ id: f.id, name: f.name });
      }
    };
    buildPath(currentFolderId);
    return crumbs;
  }, [currentFolderId, folders]);

  // Current folder data
  const currentFolder = folders.find(f => f.id === currentFolderId);
  const currentFiles = files.filter(f => f.folder_id === currentFolderId);
  const subfolders = folders.filter(f => f.parent_id === currentFolderId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-md p-4 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-6 px-2">
            <span className="text-xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              CMS Explorer
            </span>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <Button size="sm" onClick={() => setIsUploadModalOpen(true)} className="w-full justify-start text-xs font-semibold gap-2 border border-slate-800 hover:bg-white/5 bg-transparent text-slate-300">
              <Upload className="size-4" /> Upload MD File
            </Button>
            <Button size="sm" onClick={() => setIsFolderModalOpen(true)} className="w-full justify-start text-xs font-semibold gap-2 border border-slate-800 hover:bg-white/5 bg-transparent text-slate-300">
              <FolderPlus className="size-4" /> New Folder
            </Button>
          </div>

          {/* Directory Tree */}
          <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
            <NavTree
              folders={folders}
              files={files}
              parentId={null}
              depth={0}
              currentFolderId={currentFolderId}
              onSelectFolder={(id) => setCurrentFolderId(id)}
              onSelectFile={(id) => navigate(`/admin/editor/${id}`)}
            />
          </div>

        </div>

        {/* Sidebar Footer Actions */}
        <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="w-full justify-start gap-2 hover:bg-white/5 text-slate-400 hover:text-white">
            <Home className="size-4" /> Public Site
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20">
            <LogOut className="size-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header and Breadcrumbs */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">File Manager</h1>
            <nav className="flex items-center gap-2 text-sm text-slate-500">
              {breadcrumbs.map((crumb: { id: number | null; name: string }, idx: number) => (
                <div key={idx} className="flex items-center gap-1">
                  {idx > 0 && <ChevronRight className="size-3" />}
                  <span
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className="hover:text-slate-300 cursor-pointer transition-colors"
                  >
                    {crumb.name}
                  </span>
                </div>
              ))}
            </nav>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={() => navigate('/admin/editor')} className="bg-violet-600 hover:bg-violet-700 text-white">
              <Plus className="size-4 mr-1" /> New Document
            </Button>
          </div>
        </div>

        {/* Current Folder Info & Delete */}
        {currentFolder && (
          <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FolderOpen className="text-violet-400 size-5" />
                {currentFolder.name}
              </h2>
              <span className="text-xs text-slate-500">Folder Slug: {currentFolder.slug}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleToggleArchiveFolder(currentFolder.id)} className="border-slate-800 text-slate-400 hover:bg-white/5 hover:text-white">
                <Archive className="size-4 mr-1" /> {currentFolder.status === 'archived' ? 'Unarchive' : 'Archive'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDeleteFolder(currentFolder.id, currentFolder.name)} className="text-rose-400 hover:bg-rose-950/20 hover:text-rose-300">
                <Trash className="size-4 mr-1" /> Delete
              </Button>
            </div>
          </div>
        )}

        {/* Subfolders Grid */}
        {subfolders.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Subfolders</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subfolders.map(f => (
                <div
                  key={f.id}
                  onClick={() => setCurrentFolderId(f.id)}
                  className={`p-4 rounded-xl bg-slate-900/40 border transition-all cursor-pointer flex items-center justify-between hover:border-violet-500/50 hover:bg-slate-900/60 ${
                    f.status === 'archived' ? 'opacity-50 border-dashed border-slate-800' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="text-violet-400 size-5" />
                    <div>
                      <h4 className="font-semibold text-slate-100">{f.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {f.status === 'archived' ? 'Archived' : 'Active'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files Listing */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Files</h3>
          {currentFiles.length > 0 ? (
            <AnimatedList
              items={currentFiles}
              onItemSelect={(file) => navigate(`/admin/editor/${file.id}`)}
              renderItem={(file, _, isSelected) => {
                const statusBadge = file.status === 'active'
                  ? <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">Active</span>
                  : <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">Archived</span>;

                return (
                  <div className={`item ${isSelected ? 'selected' : ''} flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 hover:border-violet-500 transition-all`}>
                    <div className="flex items-center gap-3">
                      <FileText className="text-violet-400 size-5" />
                      <div>
                        <h4 className="font-semibold text-slate-100 flex items-center gap-2">
                          {file.title} {statusBadge}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Last updated {new Date(file.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/admin/editor/${file.id}`); }} className="hover:bg-white/5 size-8 rounded-lg text-slate-400 hover:text-white" title="Edit">
                        <Edit2 className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleToggleArchiveFile(file.id); }} className="hover:bg-white/5 size-8 rounded-lg text-slate-400 hover:text-white" title="Archive / Unarchive">
                        <Archive className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id, file.title); }} className="hover:bg-rose-950/20 size-8 rounded-lg text-rose-400 hover:text-rose-300" title="Delete">
                        <Trash className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              }}
            />
          ) : (
            <div className="text-center text-slate-500 py-16 bg-slate-900/20 rounded-2xl border border-slate-800 border-dashed max-w-xl mx-auto">
              This folder is empty. Create a new document or upload a markdown file to get started.
            </div>
          )}
        </div>
      </main>

      {/* CREATE FOLDER DIALOG */}
      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
        <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="text-violet-400 size-5" /> Create New Folder
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-xs font-semibold text-slate-400 uppercase block mb-2">Folder Name</label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Research Papers"
              className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-violet-500 focus-visible:border-violet-500"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsFolderModalOpen(false)} className="hover:bg-white/5 text-slate-400">Cancel</Button>
            <Button onClick={handleCreateFolder} className="bg-violet-600 hover:bg-violet-700 text-white">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UPLOAD FILE DIALOG */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="text-violet-400 size-5" /> Upload Markdown File
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase block mb-2">Select file (.md)</label>
              <input
                type="file"
                accept=".md"
                onChange={(e) => setUploadFileObj(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700 cursor-pointer file:cursor-pointer"
              />
            </div>
            <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="text-violet-400 size-4 mt-0.5 shrink-0" />
              <span className="text-xs text-slate-400">
                Only standard markdown files with `.md` extension are supported. The title will be derived from the filename.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)} className="hover:bg-white/5 text-slate-400">Cancel</Button>
            <Button onClick={handleUploadFile} className="bg-violet-600 hover:bg-violet-700 text-white" disabled={!uploadFileObj}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
