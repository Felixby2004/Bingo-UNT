import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { MessageCircle } from 'lucide-react';

import Navbar from './Navbar';
import AdminPanel from './AdminPanel';
import PublicView from './PublicView';
import Login from './Login';
import Footer from './Footer';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');

const BingoGame = () => {
  const [view, setView] = useState('public'); // 'public', 'admin'
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState({ prize: null, drawnNumbers: [] });
  const [prizes, setPrizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState('https://api.trae.ai/api/v1/image/view/36979247-f58c-4f76-9f44-846101967268');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Fetch WhatsApp number
  useEffect(() => {
    const fetchWhatsapp = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await axios.get(`${apiUrl}/api/config/whatsapp`);
        if (res.data.whatsappNumber) setWhatsappNumber(res.data.whatsappNumber);
      } catch (err) {
        console.error('Error fetching WhatsApp number:', err);
      }
    };
    fetchWhatsapp();
  }, []);

  // Lógica para navegación interna y prevención de salida accidental
  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;
      if (state) {
        // Sincronizamos los estados de la aplicación con el historial
        if (state.view) setView(state.view);
        setSelectedPrize(state.selectedPrize || null);
      } else {
        // Si intentan ir más atrás del inicio, los mantenemos en la vista pública
        setView('public');
        setSelectedPrize(null);
        window.history.pushState({ view: 'public', selectedPrize: null }, '', window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Estado inicial
    if (!window.history.state) {
      window.history.replaceState({ view: 'public', selectedPrize: null }, '', window.location.pathname);
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Actualizar historial cuando cambian los estados manualmente
  useEffect(() => {
    const currentState = window.history.state;
    const hasChanged = !currentState || 
                      currentState.view !== view || 
                      (currentState.selectedPrize?.id !== selectedPrize?.id);

    if (hasChanged) {
      window.history.pushState({ view, selectedPrize }, '', window.location.pathname);
    }
  }, [view, selectedPrize]);

  useEffect(() => {
    checkAuth();
    fetchCurrentGame();
    fetchPrizes();
    fetchLogo();

    socket.on('logo_updated', ({ logoUrl }) => {
      setLogoUrl(logoUrl);
    });

    socket.on('number_drawn', (newNumber) => {
      setGameState(prev => ({
        ...prev,
        drawnNumbers: [newNumber, ...prev.drawnNumbers]
      }));
    });

    socket.on('game_started', ({ prize, drawnNumbers }) => {
      setGameState({ prize, drawnNumbers });
      fetchPrizes();
    });

    socket.on('game_finished', (prize) => {
      setGameState(prev => {
        if (prev.prize?.id === prize.id) {
          return { ...prev, prize };
        }
        return prev;
      });
      fetchPrizes();
    });

    socket.on('prize_added', () => fetchPrizes());
    socket.on('prize_updated', (updatedPrize) => {
      fetchPrizes();
      if (gameState.prize?.id === updatedPrize.id) {
        setGameState(prev => ({ ...prev, prize: updatedPrize }));
      }
    });
    socket.on('prize_removed', () => fetchPrizes());

    socket.on('number_updated', (updatedNumber) => {
      setGameState(prev => ({
        ...prev,
        drawnNumbers: prev.drawnNumbers.map(n => n.id === updatedNumber.id ? updatedNumber : n)
      }));
    });

    socket.on('number_removed', ({ id }) => {
      setGameState(prev => ({
        ...prev,
        drawnNumbers: prev.drawnNumbers.filter(n => n.id !== id)
      }));
    });

    return () => {
      socket.off('logo_updated');
      socket.off('number_drawn');
      socket.off('number_updated');
      socket.off('number_removed');
      socket.off('game_started');
      socket.off('game_finished');
      socket.off('prize_added');
      socket.off('prize_updated');
      socket.off('prize_removed');
    };
  }, [gameState.prize?.id]);

  const fetchLogo = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await axios.get(`${apiUrl}/api/config/logo`);
      if (res.data.logoUrl) setLogoUrl(res.data.logoUrl);
    } catch (err) {
      console.error('Error fetching logo:', err);
    }
  };

  const checkAuth = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('admin_token');
      const config = { withCredentials: true };
      
      if (token) {
        config.headers = { Authorization: `Bearer ${token}` };
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const res = await axios.get(`${apiUrl}/api/admin/me`, config);
      
      if (res.data.user) {
        setUser(res.data.user);
        const currentPath = window.location.hash || window.location.pathname;
        if (currentPath.includes('admin') || view === 'admin') {
          setView('admin');
        }
      }
    } catch (err) {
      localStorage.removeItem('admin_token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentGame = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/game/current`);
      setGameState(res.data);
    } catch (err) {
      // Error handled by state (gameState will be null or previous)
    }
  };

  const fetchPrizes = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/prizes`);
      setPrizes(res.data);
    } catch (err) {
      // Error handled by empty prizes list
    }
  };

  const handleLogout = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      await axios.post(`${apiUrl}/api/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Limpiar TODO rastro local
      localStorage.removeItem('admin_token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setView('public');
      // Forzar recarga para limpiar cualquier estado en memoria
      window.location.href = '/';
    }
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent('BINGO, BINGO!!!');
    if (whatsappNumber) {
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-unt-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-unt-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-unt-light flex flex-col font-sans text-unt-black">
      <Navbar 
        view={view} 
        setView={setView} 
        user={user} 
        onLogout={handleLogout} 
        logoUrl={logoUrl}
        setSelectedPrize={setSelectedPrize}
      />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {view === 'admin' ? (
          user ? (
            <AdminPanel 
              gameState={gameState} 
              prizes={prizes}
              refreshGame={fetchCurrentGame}
              refreshPrizes={fetchPrizes}
              user={user}
            />
          ) : (
            <Login onLogin={setUser} />
          )
        ) : (
            <PublicView 
              gameState={gameState} 
              prizes={prizes}
              selectedPrize={selectedPrize}
              setSelectedPrize={setSelectedPrize}
            />
          )}
      </main>

      {/* WhatsApp Button */}
      {whatsappNumber && (
        <button
          onClick={handleWhatsAppClick}
          className="fixed bottom-6 right-6 w-16 h-16 bg-green-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50"
          aria-label="Enviar WhatsApp"
        >
          <MessageCircle size={32} />
        </button>
      )}

      {/* KICK Stream (if in public view and selected prize) */}
      {view === 'public' && selectedPrize && (
        <div className="container mx-auto px-4 pb-8">
          <div className="bg-unt-white rounded-[2rem] p-4 shadow-xl border-4 border-unt-light">
            <h3 className="text-lg font-black text-unt-primary uppercase tracking-tight mb-4 flex items-center space-x-2">
              <div className="w-10 h-10 bg-unt-accent rounded-lg flex items-center justify-center text-white font-black">K</div>
              <span>Transmisión en Vivo</span>
            </h3>
            <div className="aspect-video rounded-[1.5rem] overflow-hidden bg-gray-100">
              {/* Replace with actual KICK embed when available */}
              <iframe
                src="https://player.twitch.tv/?channel=twitch&parent=localhost"
                title="Live Stream"
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
                scrolling="no"
                allow="autoplay; fullscreen"
              ></iframe>
            </div>
          </div>
        </div>
      )}
      
      <Footer logoUrl={logoUrl} />
    </div>
  );
};

export default BingoGame;