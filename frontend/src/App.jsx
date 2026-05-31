import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

axios.defaults.withCredentials = true;

import Navbar from './components/Navbar';
import AdminPanel from './components/AdminPanel';
import PublicView from './components/PublicView';
import Login from './components/Login';
import HistoryView from './components/HistoryView';
import Footer from './components/Footer';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');

function App() {
  const [view, setView] = useState('public'); // 'public', 'admin', 'history'
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState({ prize: null, drawnNumbers: [] });
  const [prizes, setPrizes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchCurrentGame();
    fetchPrizes();

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
      if (gameState.prize?.id === prize.id) {
        setGameState(prev => ({ ...prev, prize }));
      }
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

    return () => {
      socket.off('number_drawn');
      socket.off('game_started');
      socket.off('game_finished');
      socket.off('prize_added');
      socket.off('prize_updated');
      socket.off('prize_removed');
    };
  }, [gameState.prize?.id]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-unt-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <Navbar 
        view={view} 
        setView={setView} 
        user={user} 
        onLogout={handleLogout} 
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
        ) : view === 'history' ? (
          <HistoryView />
      ) : (
            <PublicView 
              gameState={gameState} 
              prizes={prizes}
            />
          )}
        </main>
        
        <Footer />
    </div>
  );
}

export default App;
