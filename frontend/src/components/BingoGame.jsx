import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import PublicView from './PublicView';
import LoginModal from './LoginModal';
import AdminPanel from './AdminPanel';
import { Trophy, Settings, LogOut, Music2, MessageCircle } from 'lucide-react';

const BingoGame = () => {
  const [user, setUser] = useState(null);
  const [prizes, setPrizes] = useState([]);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [view, setView] = useState('public');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(null);
  const socketRef = useRef(null);
  const [gameState, setGameState] = useState({
    isPlaying: false,
    prize: null,
    drawnNumbers: [],
    currentNumber: null
  });

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Initialize Socket.IO connection
  useEffect(() => {
    const ioUrl = apiUrl;
    const ioScript = document.createElement('script');
    ioScript.src = `${ioUrl}/socket.io/socket.io.js`;
    ioScript.onload = () => {
      socketRef.current = window.io(ioUrl, {
        transports: ['websocket', 'polling']
      });
      
      socketRef.current.on('gameState', (state) => {
        setGameState(state);
        if (state.prize && !selectedPrize) {
          setSelectedPrize(state.prize);
        }
      });

      socketRef.current.on('prizes', (prizesList) => {
        setPrizes(prizesList);
      });
    };
    document.body.appendChild(ioScript);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      document.body.removeChild(ioScript);
    };
  }, [apiUrl, selectedPrize]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [prizesRes, settingsRes, whatsappRes] = await Promise.all([
          axios.get(`${apiUrl}/api/prizes`),
          axios.get(`${apiUrl}/api/settings`),
          axios.get(`${apiUrl}/api/config/whatsapp`)
        ]);
        setPrizes(prizesRes.data);
        setLogoUrl(settingsRes.data.logo_url || '');
        setWhatsappNumber(whatsappRes.data.whatsapp_number || null);
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    };
    fetchInitialData();
  }, [apiUrl]);

  const handleLogin = (username, password) => {
    if (username === 'admin' && password === 'admin') {
      setUser({ username: 'admin', isAdmin: true });
      setLoginModalOpen(false);
      setView('admin');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('public');
    setSelectedPrize(null);
  };

  const handleUpdateLogo = async (newLogoUrl) => {
    try {
      await axios.put(`${apiUrl}/api/admin/settings`, {
        logo_url: newLogoUrl
      }, {
        headers: { Authorization: 'Bearer admin' }
      });
      setLogoUrl(newLogoUrl);
    } catch (err) {
      console.error('Error updating logo:', err);
    }
  };

  const handleUpdatePrizes = (newPrizes) => {
    setPrizes(newPrizes);
  };

  const openWhatsapp = () => {
    if (!whatsappNumber) {
      alert('Número de WhatsApp no configurado');
      return;
    }
    const message = encodeURIComponent('¡Hola! Quiero participar en el Bingo');
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-unt-white">
      <Navbar 
        view={view} 
        setView={setView}
        user={user}
        onLogout={handleLogout}
        logoUrl={logoUrl}
        setSelectedPrize={setSelectedPrize}
      />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {view === 'login' && (
          <LoginModal 
            isOpen={loginModalOpen}
            onClose={() => setLoginModalOpen(false)}
            onLogin={handleLogin}
          />
        )}
        
        {view === 'admin' && user ? (
          <AdminPanel 
            prizes={prizes}
            onUpdatePrizes={handleUpdatePrizes}
            onUpdateLogo={handleUpdateLogo}
            logoUrl={logoUrl}
            socket={socketRef.current}
          />
        ) : (
          <div className="space-y-8">
            {/* KICK Stream Section */}
            <div className="bg-unt-blue rounded-[2rem] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-unt-yellow uppercase flex items-center gap-2">
                  <Music2 size={28} />
                  Transmisión en Vivo
                </h2>
              </div>
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <iframe 
                  src="https://player.kick.com/felix-04p" 
                  height="100%" 
                  width="100%" 
                  frameBorder="0" 
                  scrolling="no" 
                  allowFullScreen
                  title="KICK Stream"
                />
              </div>
            </div>

            <PublicView 
              gameState={gameState}
              prizes={prizes}
              selectedPrize={selectedPrize}
              setSelectedPrize={setSelectedPrize}
            />

            {/* WhatsApp Button */}
            {whatsappNumber && (
              <div className="fixed bottom-8 right-8 z-50">
                <button
                  onClick={openWhatsapp}
                  className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all"
                  title="Contactar por WhatsApp"
                >
                  <MessageCircle size={32} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default BingoGame;
