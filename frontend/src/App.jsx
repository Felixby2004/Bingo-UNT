import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios';
import Home from './components/Home';
import BingoGame from './components/BingoGame';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('public'); // 'public', 'login', 'admin', 'config'
  const [logoUrl, setLogoUrl] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
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

    const fetchLogo = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/config/logo`);
        if (res.data.logoUrl) setLogoUrl(res.data.logoUrl);
      } catch (err) {
        console.error('Error fetching logo:', err);
      }
    };
    fetchLogo();
  }, [apiUrl]);

  const handleLogin = async (userData) => {
    try {
      const response = await axios.get(`${apiUrl}/api/admin/me`);
      setUser(response.data.user);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setUser(userData);
    }
    setView('admin');
  };

  const handleLogout = () => {
    setUser(null);
    setView('public');
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
    <div className="min-h-screen bg-unt-white flex flex-col font-sans text-unt-black">
      <Navbar 
        logoUrl={logoUrl} 
        user={user} 
        onLogout={handleLogout}
        setView={setView}
      />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<BingoGame 
          user={user} 
          onLogout={handleLogout} 
          view={view}
          setView={setView}
        />} />
          <Route path="/*" element={<BingoGame 
          user={user} 
          onLogout={handleLogout} 
          view={view}
          setView={setView}
        />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
