import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import PublicView from './PublicView';
import Login from './Login';
import AdminPanel from './AdminPanel';
import { Trophy, Settings, LogOut, Music2, MessageCircle, Plus, Trash2, Edit2, Save } from 'lucide-react';

const BingoGame = () => {
  const [user, setUser] = useState(null);
  const [prizes, setPrizes] = useState([]);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [view, setView] = useState('public'); // 'public', 'login', 'admin', 'config'
  const [logoUrl, setLogoUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(null);
  const socketRef = useRef(null);
  const [gameState, setGameState] = useState({
    isPlaying: false,
    prize: null,
    drawnNumbers: [],
    currentNumber: null
  });

  // Configuration management
  const [gallery, setGallery] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [newGalleryItem, setNewGalleryItem] = useState({ image_url: '', caption: '' });
  const [newPastEvent, setNewPastEvent] = useState({ title: '', date: '', description: '', image_url: '' });
  const [editingGalleryItem, setEditingGalleryItem] = useState(null);
  const [editingPastEvent, setEditingPastEvent] = useState(null);
  const [configWhatsapp, setConfigWhatsapp] = useState('');

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
        const [prizesRes, settingsRes, whatsappRes, galleryRes, eventsRes] = await Promise.all([
          axios.get(`${apiUrl}/api/prizes`),
          axios.get(`${apiUrl}/api/settings`),
          axios.get(`${apiUrl}/api/config/whatsapp`),
          axios.get(`${apiUrl}/api/gallery`),
          axios.get(`${apiUrl}/api/past-events`)
        ]);
        setPrizes(prizesRes.data);
        setLogoUrl(settingsRes.data.logo_url || '');
        setWhatsappNumber(whatsappRes.data.whatsapp_number || null);
        setConfigWhatsapp(whatsappRes.data.whatsapp_number || '');
        setGallery(galleryRes.data);
        setPastEvents(eventsRes.data);
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    };
    fetchInitialData();
  }, [apiUrl]);

  const handleLogin = (userData) => {
    setUser(userData);
    setView('admin');
  };

  const handleLogout = () => {
    setUser(null);
    setView('public');
    setSelectedPrize(null);
    axios.defaults.headers.common['Authorization'] = undefined;
    localStorage.removeItem('admin_token');
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

  const handleAddGalleryItem = async (e) => {
    e.preventDefault();
    if (!newGalleryItem.image_url.trim()) return;
    try {
      const res = await axios.post(`${apiUrl}/api/admin/gallery`, newGalleryItem, {
        headers: { Authorization: 'Bearer admin' }
      });
      setGallery([...gallery, res.data]);
      setNewGalleryItem({ image_url: '', caption: '' });
    } catch (err) {
      console.error('Error adding gallery item:', err);
      alert('Error al agregar a la galería');
    }
  };

  const handleUpdateGalleryItem = async (e) => {
    e.preventDefault();
    if (!editingGalleryItem) return;
    try {
      await axios.put(`${apiUrl}/api/admin/gallery/${editingGalleryItem.id}`, editingGalleryItem, {
        headers: { Authorization: 'Bearer admin' }
      });
      setGallery(gallery.map(item => item.id === editingGalleryItem.id ? editingGalleryItem : item));
      setEditingGalleryItem(null);
    } catch (err) {
      console.error('Error updating gallery item:', err);
      alert('Error al actualizar elemento de galería');
    }
  };

  const handleDeleteGalleryItem = async (id) => {
    if (!window.confirm('¿Eliminar esta foto?')) return;
    try {
      await axios.delete(`${apiUrl}/api/admin/gallery/${id}`, {
        headers: { Authorization: 'Bearer admin' }
      });
      setGallery(gallery.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting gallery item:', err);
      alert('Error al eliminar foto');
    }
  };

  const handleAddPastEvent = async (e) => {
    e.preventDefault();
    if (!newPastEvent.title.trim() || !newPastEvent.date.trim()) return;
    try {
      const res = await axios.post(`${apiUrl}/api/admin/past-events`, newPastEvent, {
        headers: { Authorization: 'Bearer admin' }
      });
      setPastEvents([...pastEvents, res.data]);
      setNewPastEvent({ title: '', date: '', description: '', image_url: '' });
    } catch (err) {
      console.error('Error adding past event:', err);
      alert('Error al agregar evento pasado');
    }
  };

  const handleUpdatePastEvent = async (e) => {
    e.preventDefault();
    if (!editingPastEvent) return;
    try {
      await axios.put(`${apiUrl}/api/admin/past-events/${editingPastEvent.id}`, editingPastEvent, {
        headers: { Authorization: 'Bearer admin' }
      });
      setPastEvents(pastEvents.map(event => event.id === editingPastEvent.id ? editingPastEvent : event));
      setEditingPastEvent(null);
    } catch (err) {
      console.error('Error updating past event:', err);
      alert('Error al actualizar evento pasado');
    }
  };

  const handleDeletePastEvent = async (id) => {
    if (!window.confirm('¿Eliminar este evento?')) return;
    try {
      await axios.delete(`${apiUrl}/api/admin/past-events/${id}`, {
        headers: { Authorization: 'Bearer admin' }
      });
      setPastEvents(pastEvents.filter(event => event.id !== id));
    } catch (err) {
      console.error('Error deleting past event:', err);
      alert('Error al eliminar evento');
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

      {/* Gallery Config */}
      <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
        <h2 className="text-lg font-black text-unt-blue mb-4 uppercase flex items-center gap-2">
          <Settings size={20} className="text-unt-yellow" />
          Galería de Fotos
        </h2>
        
        {editingGalleryItem ? (
          <form onSubmit={handleUpdateGalleryItem} className="space-y-4 mb-6">
            <input
              type="text"
              value={editingGalleryItem.image_url}
              onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, image_url: e.target.value })}
              placeholder="URL de la imagen"
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none font-bold"
            />
            <input
              type="text"
              value={editingGalleryItem.caption}
              onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, caption: e.target.value })}
              placeholder="Descripción (opcional)"
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none"
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-unt-blue text-unt-yellow px-4 py-2 rounded-xl font-black uppercase">
                <Save size={16} className="inline mr-1" />
                Guardar
              </button>
              <button type="button" onClick={() => setEditingGalleryItem(null)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-black uppercase">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAddGalleryItem} className="space-y-4 mb-6">
            <input
              type="text"
              value={newGalleryItem.image_url}
              onChange={(e) => setNewGalleryItem({ ...newGalleryItem, image_url: e.target.value })}
              placeholder="URL de la imagen"
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none font-bold"
            />
            <input
              type="text"
              value={newGalleryItem.caption}
              onChange={(e) => setNewGalleryItem({ ...newGalleryItem, caption: e.target.value })}
              placeholder="Descripción (opcional)"
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none"
            />
            <button type="submit" className="bg-unt-blue text-unt-yellow px-4 py-2 rounded-xl font-black uppercase flex items-center gap-2">
              <Plus size={16} />
              Agregar Foto
            </button>
          </form>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gallery.map(item => (
            <div key={item.id} className="relative group">
              <div className="aspect-square overflow-hidden rounded-xl shadow-lg">
                <img src={item.image_url} alt={item.caption} className="w-full h-full object-cover" />
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingGalleryItem(item)}
                  className="p-2 bg-white rounded-lg shadow-lg text-unt-blue hover:bg-unt-yellow"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => handleDeleteGalleryItem(item.id)}
                  className="p-2 bg-white rounded-lg shadow-lg text-red-500 hover:bg-red-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {item.caption && (
                <p className="mt-2 text-xs text-gray-600 font-bold">{item.caption}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Past Events Config */}
      <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
        <h2 className="text-lg font-black text-unt-blue mb-4 uppercase flex items-center gap-2">
          <Trophy size={20} className="text-unt-yellow" />
          Eventos Pasados
        </h2>

        {editingPastEvent ? (
          <form onSubmit={handleUpdatePastEvent} className="space-y-4 mb-6">
            <input
              type="text"
              value={editingPastEvent.title}
              onChange={(e) => setEditingPastEvent({ ...editingPastEvent, title: e.target.value })}
              placeholder="Título del evento"
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none font-bold"
            />
            <input
              type="text"
              value={editingPastEvent.date}
              onChange={(e) => setEditingPastEvent({ ...editingPastEvent, date: e.target.value })}
              placeholder="Fecha (ej: 15 de Diciembre 2024)"
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none"
            />
            <textarea
              value={editingPastEvent.description}
              onChange={(e) => setEditingPastEvent({ ...editingPastEvent, description: e.target.value })}
              placeholder="Descripción (opcional)"
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none resize-none h-24"
            />
            <input
              type="text"
              value={editingPastEvent.image_url}
              onChange={(e) => setEditingPastEvent({ ...editingPastEvent, image_url: e.target.value })}
              placeholder="URL de imagen (opcional)"
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none"
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-unt-blue text-unt-yellow px-4 py-2 rounded-xl font-black uppercase">
                <Save size={16} className="inline mr-1" />
                Guardar
              </button>
              <button type="button" onClick={() => setEditingPastEvent(null)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-black uppercase">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAddPastEvent} className="space-y-4 mb-6">
            <input
              type="text"
              value={newPastEvent.title}
              onChange={(e) => setNewPastEvent({ ...newPastEvent, title: e.target.value })}
              placeholder="Título del evento"
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none font-bold"
            />
            <input
              type="text"
              value={newPastEvent.date}
              onChange={(e) => setNewPastEvent({ ...newPastEvent, date: e.target.value })}
              placeholder="Fecha (ej: 15 de Diciembre 2024)"
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none"
            />
            <textarea
              value={newPastEvent.description}
              onChange={(e) => setNewPastEvent({ ...newPastEvent, description: e.target.value })}
              placeholder="Descripción (opcional)"
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none resize-none h-24"
            />
            <input
              type="text"
              value={newPastEvent.image_url}
              onChange={(e) => setNewPastEvent({ ...newPastEvent, image_url: e.target.value })}
              placeholder="URL de imagen (opcional)"
              className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-unt-blue rounded-xl outline-none"
            />
            <button type="submit" className="bg-unt-blue text-unt-yellow px-4 py-2 rounded-xl font-black uppercase flex items-center gap-2">
              <Plus size={16} />
              Agregar Evento
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pastEvents.map(event => (
            <div key={event.id} className="relative group bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-unt-blue uppercase">{event.title}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingPastEvent(event)}
                    className="p-1 text-gray-400 hover:text-unt-blue"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeletePastEvent(event.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-bold mb-2">{event.date}</p>
              {event.description && <p className="text-sm text-gray-600">{event.description}</p>}
              {event.image_url && (
                <div className="mt-3 aspect-video rounded-xl overflow-hidden">
                  <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          ))}
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
