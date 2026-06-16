import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PublicView from './PublicView';
import Login from './Login';
import AdminPanel from './AdminPanel';
import { Music2, MessageCircle } from 'lucide-react';

const BingoGame = ({ user, onLogout, view, setView }) => {
  const [prizes, setPrizes] = useState([]);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [whatsappNumber, setWhatsappNumber] = useState(null);
  const [streamState, setStreamState] = useState('normal'); // 'normal', 'minimized', 'collapsed'
  const [streamPosition, setStreamPosition] = useState({ x: 0, y: 0 });
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
  const [configWhatsapp, setConfigWhatsapp] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Initialize Socket.IO connection and fetch user data
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
        const [prizesRes, whatsappRes] = await Promise.all([
          axios.get(`${apiUrl}/api/prizes`),
          axios.get(`${apiUrl}/api/config/whatsapp`)
        ]);
        setPrizes(prizesRes.data);
        setWhatsappNumber(whatsappRes.data.whatsapp_number || null);
        setConfigWhatsapp(whatsappRes.data.whatsapp_number || '');
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    };
    fetchInitialData();
  }, [apiUrl]);

  // Handle drag and drop
  const handleMouseDown = (e) => {
    // Only start dragging if clicking on the header (not the buttons or iframe)
    if (!e.target.closest('.drag-handle')) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - streamPosition.x,
      y: e.clientY - streamPosition.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !streamContainerRef.current) return;

    const containerWidth = streamContainerRef.current.offsetWidth;
    const containerHeight = streamContainerRef.current.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;

    // Keep within viewport bounds
    newX = Math.max(0, Math.min(newX, windowWidth - containerWidth));
    newY = Math.max(0, Math.min(newY, windowHeight - containerHeight));

    setStreamPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleLogin = async (userData) => {
    try {
      const response = await axios.get(`${apiUrl}/api/admin/me`);
      setView('admin');
    } catch (err) {
      console.error('Error fetching user data after login:', err);
      setView('admin');
    }
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

  // Configuration handlers
  const handleSaveWhatsapp = async () => {
    try {
      await axios.put(`${apiUrl}/api/admin/config/whatsapp`, { 
        whatsapp_number: configWhatsapp 
      }, { 
        headers: { Authorization: 'Bearer admin' } 
      });
      setWhatsappNumber(configWhatsapp);
      alert('Número de WhatsApp actualizado');
    } catch (err) {
      console.error('Error updating whatsapp:', err);
      alert('Error al actualizar número de WhatsApp');
    }
  };

  const renderConfig = () => (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-black text-unt-blue uppercase">Configuración del Sitio</h1>
      
      {/* WhatsApp Config */}
      <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
        <h2 className="text-lg font-black text-unt-blue mb-4 uppercase flex items-center gap-2">
          <MessageCircle size={20} className="text-unt-yellow" />
          Número de WhatsApp
        </h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={configWhatsapp}
            onChange={(e) => setConfigWhatsapp(e.target.value)}
            placeholder="5491112345678"
            className="flex-1 p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none font-bold"
          />
          <button
            onClick={handleSaveWhatsapp}
            className="bg-unt-blue text-unt-yellow px-6 py-3 rounded-xl font-black uppercase hover:scale-[1.02] transition-all"
          >
            Guardar
          </button>
        </div>
      </section>

      <div className="flex justify-center">
        <button
          onClick={() => setView('admin')}
          className="bg-unt-blue text-unt-yellow px-8 py-3 rounded-xl font-black uppercase hover:scale-[1.02] transition-all"
        >
          Volver al Panel de Bingo
        </button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {view === 'login' && (
        <Login onLogin={handleLogin} />
      )}
      
      {view === 'config' && user ? (
        renderConfig()
      ) : view === 'admin' && user ? (
        <AdminPanel 
          gameState={gameState}
          prizes={prizes}
          refreshGame={refreshGame}
          refreshPrizes={refreshPrizes}
          user={user}
        />
      ) : (
        <>
          {/* KICK Stream Section - Floating, Controllable, Draggable */}
          {selectedPrize && streamState !== 'collapsed' && (
            <div
              ref={streamContainerRef}
              className={`
                fixed z-40 transition-all duration-300 ease-in-out
                ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                ${streamState === 'normal' 
                  ? 'w-72 sm:w-80 md:w-96 shadow-2xl' 
                  : 'w-40 sm:w-48 shadow-lg'}
              `}
              style={{
                top: streamPosition.y + 'px',
                right: 'auto',
                left: streamPosition.x + 'px'
              }}
              onMouseDown={handleMouseDown}
            >
              <div className="bg-unt-blue rounded-t-xl p-3 flex items-center justify-between drag-handle">
                <h2 className="text-xs sm:text-sm font-black text-unt-yellow uppercase flex items-center gap-2">
                  <Music2 size={14} sm={16} />
                  Transmisión
                </h2>
                <div className="flex gap-2" onMouseDown={(e) => e.stopPropagation()}>
                  {streamState === 'normal' ? (
                    <button 
                      onClick={() => setStreamState('minimized')}
                      className="text-white hover:text-unt-yellow transition-colors"
                      title="Minimizar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="19"></line></svg>
                    </button>
                  ) : (
                    <button 
                      onClick={() => setStreamState('normal')}
                      className="text-white hover:text-unt-yellow transition-colors"
                      title="Expandir"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                    </button>
                  )}
                  <button 
                    onClick={() => setStreamState('collapsed')}
                    className="text-white hover:text-red-400 transition-colors"
                    title="Cerrar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </div>
              <div className={`
                bg-black overflow-hidden
                ${streamState === 'normal' ? 'aspect-video rounded-b-xl' : 'h-24 sm:h-28 rounded-b-xl'}
              `}>
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

          {/* Button to re-open collapsed stream */}
          {selectedPrize && streamState === 'collapsed' && (
            <button 
              onClick={() => setStreamState('normal')}
              className="fixed right-4 top-20 z-40 bg-unt-blue text-unt-yellow p-3 rounded-full shadow-2xl hover:scale-110 transition-transform"
              title="Abrir transmisión"
            >
              <Music2 size={24} />
            </button>
          )}

          <PublicView 
            gameState={gameState}
            prizes={prizes}
            selectedPrize={selectedPrize}
            setSelectedPrize={setSelectedPrize}
          />

          {/* WhatsApp Button */}
          {selectedPrize && whatsappNumber && (
            <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50">
              <button
                onClick={openWhatsapp}
                className="bg-green-500 hover:bg-green-600 text-white p-3 sm:p-4 rounded-full shadow-2xl hover:scale-110 transition-all"
                title="Contactar por WhatsApp"
              >
                <MessageCircle size={20} sm={32} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BingoGame;
