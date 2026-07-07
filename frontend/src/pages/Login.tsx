import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthFormSplitScreen, FormValues } from '@/components/ui/login';
import DarkVeil from '@/components/ui/DarkVeil';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Login - FastAPI Markdown CMS';
  }, []);

  const handleLogin = async (data: FormValues) => {
    try {
      // Build form-urlencoded request for OAuth2 endpoint
      const formData = new URLSearchParams();
      formData.append('username', data.email); // AuthForm field email maps to username
      formData.append('password', data.password);

      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const err = await response.json();
        alert(err.detail || 'Login failed. Please check your credentials.');
        return;
      }

      const result = await response.json();
      // Store token in localStorage
      localStorage.setItem('access_token', result.access_token);
      
      // Also write access_token to document.cookie in case backend API routes check cookies
      document.cookie = `access_token=${result.access_token}; path=/; max-age=86400; samesite=lax`;

      navigate('/admin/files');
    } catch (error) {
      console.error('Error logging in:', error);
      alert('An error occurred during login.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col md:flex-row overflow-hidden bg-slate-950">
      {/* Background DarkVeil for premium ambient effect */}
      <div className="absolute inset-0 z-0 opacity-40">
        <DarkVeil 
          hueShift={280} 
          noiseIntensity={0.03} 
          scanlineIntensity={0.1} 
          speed={0.3} 
          scanlineFrequency={2}
          warpAmount={0.03} 
        />
      </div>

      <div className="relative w-full z-10">
        <AuthFormSplitScreen
          logo={
            <div className="flex items-center gap-2">
              <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                Markdown CMS
              </span>
            </div>
          }
          title="Admin Access"
          description="Log in to manage your folders and markdown files"
          imageSrc="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200"
          imageAlt="Premium abstract neon fluid art background"
          onSubmit={handleLogin}
        />
      </div>
    </div>
  );
}
