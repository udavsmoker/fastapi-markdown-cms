import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CardNav from '@/components/ui/CardNav';
import Folder from '@/components/ui/Folder';
import AnimatedList from '@/components/ui/AnimatedList';
import { BookOpen, FolderOpen, FileText } from 'lucide-react';

interface FileItem {
  id: number;
  title: string;
  slug: string;
  created_at: string;
  updated_at: string;
  folder_id: number | null;
}

interface FolderItem {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
}

export default function Home() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [typingText, setTypingText] = useState('');
  const words = ['Notes', 'Guides', 'Docs', 'Brain Dumps'];

  // Check login status
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token);
  }, []);

  useEffect(() => {
    document.title = 'Home - FastAPI Markdown CMS';
  }, []);

  // Typing animation
  useEffect(() => {
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const currentWord = words[wordIndex];
      if (isDeleting) {
        setTypingText(currentWord.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setTypingText(currentWord.substring(0, charIndex + 1));
        charIndex++;
      }

      let speed = isDeleting ? 75 : 150;
      if (!isDeleting && charIndex === currentWord.length) {
        speed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        speed = 500;
      }
      timeout = setTimeout(tick, speed);
    };

    tick();
    return () => clearTimeout(timeout);
  }, []);

  // Fetch folders and files
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [filesRes, foldersRes] = await Promise.all([
          fetch('/api/files'),
          fetch('/api/files/folders'),
        ]);
        if (filesRes.ok && foldersRes.ok) {
          setFiles(await filesRes.json());
          setFolders(await foldersRes.json());
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  const handleFolderClick = (id: number | null) => {
    setSelectedFolderId(prev => (prev === id ? null : id));
  };

  const handleFileSelect = (file: FileItem) => {
    navigate(`/files/${file.slug}`);
  };

  const filteredFiles = selectedFolderId
    ? files.filter(f => f.folder_id === selectedFolderId)
    : files.filter(f => f.folder_id === null);

  const cardNavItems = [
    {
      label: 'Browse',
      bgColor: '#1e1b4b',
      textColor: '#ffffff',
      links: [
        { label: 'Root Files', href: '#root-files', ariaLabel: 'Browse Root Files' },
        { label: 'Folders', href: '#folders', ariaLabel: 'Browse Folders' },
      ],
    },
    {
      label: 'Admin',
      bgColor: '#311042',
      textColor: '#ffffff',
      links: isLoggedIn
        ? [
            { label: 'File Manager', href: '/admin/files', ariaLabel: 'File Manager' },
            { label: 'New Document', href: '/admin/editor', ariaLabel: 'Create New Document' },
          ]
        : [{ label: 'Login Panel', href: '/admin/login', ariaLabel: 'Admin Login' }],
    },
  ];

  const sectionHeading = (icon: React.ReactNode, label: string) => (
    <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-800">
      <span className="text-violet-400">{icon}</span>
      <h2 className="text-xl font-bold tracking-tight">{label}</h2>
    </div>
  );

  const emptyState = (msg: string) => (
    <div className="text-center text-slate-500 py-10 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-sm">
      {msg}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col">
      {/* ── Navbar ──────────────────────────────────────────────── */}
      {/* CardNav is position:absolute, top:2em → need padding-top to clear it */}
      <div className="relative z-50 h-28" />
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <CardNav
            logoAlt="Markdown CMS"
            items={cardNavItems}
            buttonText={isLoggedIn ? 'Admin Panel' : 'Login'}
            onButtonClick={() => navigate(isLoggedIn ? '/admin/files' : '/admin/login')}
          />
        </div>
      </div>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="w-full max-w-6xl mx-auto px-6 pt-16 pb-14 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-5 text-center">
          <span className="block text-slate-100">Organize Your Knowledge</span>
          <span className="block">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
              with {typingText}
            </span>
            <span className="animate-pulse text-violet-400">|</span>
          </span>
        </h1>
        <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          A minimalist, lightning-fast CMS built for storing, editing, and reading your markdown
          files.
        </p>
      </section>

      {/* ── Main content ──────────────────────────────────────── */}
      <main className="w-full max-w-6xl mx-auto px-6 flex flex-col gap-16 pb-24">
        {/* Folders */}
        <section id="folders">
          {sectionHeading(<FolderOpen className="size-5" />, 'Directory Folders')}
          {folders.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-10 py-4">
              {folders.map(folder => {
                const folderFiles = files.filter(f => f.folder_id === folder.id);
                const filePlaceholders = folderFiles.slice(0, 3).map(f => (
                  <div key={f.id} className="flex items-center justify-center h-full">
                    <FileText className="size-4 text-violet-500" />
                  </div>
                ));
                return (
                  <Folder
                    key={folder.id}
                    label={folder.name}
                    color={selectedFolderId === folder.id ? '#c084fc' : '#6366f1'}
                    items={filePlaceholders}
                    size={1.1}
                    isOpen={selectedFolderId === folder.id}
                    onOpenChange={(open) => setSelectedFolderId(open ? folder.id : null)}
                  />
                );
              })}
            </div>
          ) : (
            emptyState('No folders created yet.')
          )}
        </section>

        {/* Documents */}
        <section id="root-files">
          {sectionHeading(
            <BookOpen className="size-5" />,
            selectedFolderId
              ? `${folders.find(f => f.id === selectedFolderId)?.name ?? 'Folder'} Contents`
              : 'Root Documents',
          )}
          {filteredFiles.length > 0 ? (
            <AnimatedList
              items={filteredFiles}
              onItemSelect={handleFileSelect}
              renderItem={(file, _, isSelected) => (
                <div
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer
                    ${isSelected
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-slate-800 bg-slate-900/50 hover:border-violet-500/60 hover:bg-slate-800/50'
                    }`}
                >
                  <FileText className="text-violet-400 size-5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-100 leading-tight">{file.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            />
          ) : (
            emptyState(
              selectedFolderId ? 'This folder is empty.' : 'No files in root directory.',
            )
          )}
        </section>
      </main>
    </div>
  );
}
