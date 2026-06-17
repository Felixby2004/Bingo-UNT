import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PublicView from './PublicView';
import Login from './Login';
import AdminPanel from './AdminPanel';
import { Radio, MessageCircle, X } from 'lucide-react';

const BingoGame = ({ user, onLogout, view, setView }) => {
  const [prizes, setPrizes] = useState([]);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [whatsappNumber, setWhatsappNumber] = useState(null);
  const [isStreamOpen, setIsStreamOpen] = useState(true); // true = open, false = closed
  const [showPrizes, setShowPrizes] = useState(false);
  const socketRef = useRef(null);
  const streamContainerRef = useRef(null);
  const [gameState, setGameState] = useState({
    isPlaying: false,
    prize: null,
    drawnNumbers: [],
    currentNumber: null
  });

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    const ioScript = document.createElement('script');
    ioScript.src = `${apiUrl}/socket.io/socket.io.js`;
    ioScript.onload = () => {
      socketRef.current = window.io(apiUrl, {
        transports: ['websocket', 'polling']
      });
      
      socketRef.current.on('game_state', (state) => {
        setGameState(state);
        if (state.prize && !selectedPrize) {
          setSelectedPrize(state.prize);
          setShowPrizes(true);
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

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [prizesRes, whatsappRes] = await Promise.all([
          axios.get(`${apiUrl}/api/prizes`),
          axios.get(`${apiUrl}/api/config/whatsapp`)
        ]);
        setPrizes(prizesRes.data);
        setWhatsappNumber(whatsappRes.data.whatsappNumber || null);
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    };
    fetchInitialData();
  }, [apiUrl]);



  const handleLogin = async (userData) => {
    setView('admin');
  };

  const refreshPrizes = async () => {
    const res = await axios.get(`${apiUrl}/api/prizes`);
    setPrizes(res.data);
  };

  const refreshGame = async () => {
    // Just rely on socket updates
  };

  const openWhatsapp = () => {
    if (!whatsappNumber) {
      alert('Número de WhatsApp no configurado');
      return;
    }
    const message = encodeURIComponent('¡Hola! Quiero participar en el Bingo');
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  if (view === 'login') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  if (view === 'admin' && user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <AdminPanel 
          gameState={gameState}
          prizes={prizes}
          refreshGame={refreshGame}
          refreshPrizes={refreshPrizes}
          user={user}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* KICK Stream Section */}
      {isStreamOpen && (
        <div className="fixed z-50 top-20 right-4 shadow-2xl w-72 sm:w-80">
          <div className="bg-unt-blue p-3 flex items-center justify-between rounded-t-xl">
            <h2 className="text-xs sm:text-sm font-black text-unt-yellow uppercase flex items-center gap-2">
              <Radio size={14} />
              Transmisión
            </h2>
            <button 
              onClick={() => setIsStreamOpen(false)}
              className="text-white hover:text-red-400 transition-colors"
              title="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
          <div className="bg-black aspect-video rounded-b-xl overflow-hidden">
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
      )}

      {/* Button to re-open stream */}
      {!isStreamOpen && (
        <button 
          onClick={() => setIsStreamOpen(true)}
          className="fixed right-4 top-20 z-50 bg-unt-blue text-unt-yellow p-3 rounded-full shadow-2xl hover:scale-110 transition-transform"
          title="Abrir transmisión"
        >
          <Radio size={24} />
        </button>
      )}

      <PublicView 
        gameState={gameState}
        prizes={prizes}
        selectedPrize={selectedPrize}
        setSelectedPrize={setSelectedPrize}
        showPrizes={showPrizes}
        setShowPrizes={setShowPrizes}
      />

      {/* WhatsApp Button */}
      {selectedPrize && whatsappNumber && (
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-40">
          <button
            onClick={openWhatsapp}
            className="bg-green-500 hover:bg-green-600 text-white p-3 sm:p-4 rounded-full shadow-2xl hover:scale-110 transition-all"
            title="Contactar por WhatsApp"
          >
            <MessageCircle size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default BingoGame;
