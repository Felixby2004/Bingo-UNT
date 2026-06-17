import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PublicView from './PublicView';
import Login from './Login';
import AdminPanel from './AdminPanel';
import { Radio, MessageCircle, X } from 'lucide-react';

const BingoGame = ({ user, onLogout, view, setView, selectedPrize, setSelectedPrize, showPrizes, setShowPrizes }) => {
  const [prizes, setPrizes] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState(null);
  const [isStreamOpen, setIsStreamOpen] = useState(true); // true = open, false = closed
  const [streamPosition, setStreamPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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



  const handleMouseDown = (e) => {
    if (!e.target.closest('.drag-handle')) return;
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({ x: e.clientX - streamPosition.x, y: e.clientY - streamPosition.y });
  };

  const handleTouchStart = (e) => {
    if (!e.target.closest('.drag-handle')) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragOffset({ x: touch.clientX - streamPosition.x, y: touch.clientY - streamPosition.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !streamContainerRef.current) return;
    const containerWidth = streamContainerRef.current.offsetWidth;
    const containerHeight = streamContainerRef.current.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;

    newX = Math.max(0, Math.min(newX, windowWidth - containerWidth));
    newY = Math.max(0, Math.min(newY, windowHeight - containerHeight));

    setStreamPosition({ x: newX, y: newY });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !streamContainerRef.current) return;
    const touch = e.touches[0];
    const containerWidth = streamContainerRef.current.offsetWidth;
    const containerHeight = streamContainerRef.current.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newX = touch.clientX - dragOffset.x;
    let newY = touch.clientY - dragOffset.y;

    newX = Math.max(0, Math.min(newX, windowWidth - containerWidth));
    newY = Math.max(0, Math.min(newY, windowHeight - containerHeight));

    setStreamPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging]);

  const handleLogin = async (userData) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.get(`${apiUrl}/api/admin/me`);
      onLogin(response.data.user);
    } catch (err) {
      console.error('Error fetching user data after login:', err);
      onLogin(userData);
    }
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
    const message = encodeURIComponent('BINGO, BINGO, BINGO!!!');
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
        <div
          ref={streamContainerRef}
          className={`
            fixed z-50 transition-all duration-300 ease-in-out
            ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
            shadow-2xl w-72 sm:w-80
          `}
          style={{
            top: `${streamPosition.y}px`,
            right: 'auto',
            left: `${streamPosition.x}px`,
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="bg-unt-blue p-3 flex items-center justify-between drag-handle rounded-t-xl">
            <h2 className="text-xs sm:text-sm font-black text-unt-yellow uppercase flex items-center gap-2">
              <Radio size={14} />
              Transmisión
            </h2>
            <div className="flex gap-2" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setIsStreamOpen(false)}
                className="text-white hover:text-red-400 transition-colors"
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
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

      <PublicView 
        gameState={gameState}
        prizes={prizes}
        selectedPrize={selectedPrize}
        setSelectedPrize={setSelectedPrize}
        showPrizes={showPrizes}
        setShowPrizes={setShowPrizes}
      />

      {/* Stream Button (bottom-right, above WhatsApp) */}
      <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 z-40">
        <button 
          onClick={() => setIsStreamOpen(!isStreamOpen)}
          className="bg-unt-blue text-unt-yellow p-2 sm:p-3 rounded-full shadow-2xl hover:scale-110 transition-all"
          title={isStreamOpen ? "Cerrar transmisión" : "Abrir transmisión"}
        >
          <Radio size={20} />
        </button>
      </div>

      {/* WhatsApp Button (always visible) */}
      {whatsappNumber && (
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
