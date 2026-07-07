import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/Home';
import DocumentView from '@/pages/DocumentView';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import EditorPage from '@/pages/Editor';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/files/:slug" element={<DocumentView />} />
        
        {/* Admin Login */}
        <Route path="/admin/login" element={<Login />} />
        
        {/* Admin Dashboard & Management */}
        <Route path="/admin/files" element={<Dashboard />} />
        <Route path="/admin/editor" element={<EditorPage />} />
        <Route path="/admin/editor/:id" element={<EditorPage />} />
        
        {/* Redirect old dashboard link to files manager */}
        <Route path="/admin/dashboard" element={<Navigate to="/admin/files" replace />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
