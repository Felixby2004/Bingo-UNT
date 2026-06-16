import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Home from './components/Home';
import BingoLanding from './components/BingoLanding';
import BingoGame from './components/BingoGame';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Verificar si el usuario está logeado al cargar la app
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get(`${apiUrl}/api/admin/me`);
          setUser(response.data.user);
        } catch (err) {
          console.error('Error fetching user data:', err);
          localStorage.removeItem('admin_token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = async (userData) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.get(`${apiUrl}/api/admin/me`);
      setUser(response.data.user);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setUser(userData);
    }
    navigate('/bingo/game');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('admin_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-unt-blue flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-unt-yellow mx-auto"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<MainLayout user={user} onLogout={handleLogout}><Home /></MainLayout>} />
      <Route path="/bingo" element={<MainLayout user={user} onLogout={handleLogout}><BingoLanding /></MainLayout>} />
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route path="/bingo/game" element={<BingoGame user={user} onLogout={handleLogout} />} />
    </Routes>
  );
}

function LoginPage({ onLogin }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-unt-blue to-night-blue flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Login onLogin={onLogin} />
      </div>
    </div>
  );
}

function MainLayout({ children, user, onLogout }) {
  const [logoUrl, setLogoUrl] = useState('https://api.trae.ai/api/v1/image/view/36979247-f58c-4f76-9f44-846101967268');

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await axios.get(`${apiUrl}/api/config/logo`);
        if (res.data.logoUrl) setLogoUrl(res.data.logoUrl);
      } catch (err) {
        console.error('Error fetching logo:', err);
      }
    };
    fetchLogo();
  }, []);

  return (
    <div className="min-h-screen bg-unt-white flex flex-col font-sans text-unt-black">
      <Navbar logoUrl={logoUrl} user={user} onLogout={onLogout} />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default App;
