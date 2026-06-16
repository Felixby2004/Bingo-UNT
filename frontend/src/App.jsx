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
  const navigate = useNavigate();

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

  return (
    <Routes>
      <Route path="/" element={<MainLayout><Home /></MainLayout>} />
      <Route path="/bingo" element={<MainLayout><BingoLanding /></MainLayout>} />
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route path="/bingo/game" element={<BingoGame />} />
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

function MainLayout({ children }) {
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
      <Navbar logoUrl={logoUrl} />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default App;
