import React, { useState, useEffect } from 'react';
import { LayoutDashboard, LogOut, Menu, X, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Navbar = ({ user, onLogout, logoUrl, setView }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(null);
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  useEffect(() => {
    const fetchWhatsapp = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/config/whatsapp`);
        setWhatsappNumber(res.data.whatsappNumber);
      } catch (err) {
        console.error('Error fetching whatsapp number:', err);
      }
    };
    fetchWhatsapp();
  }, [apiUrl]);
  
  const handleContactClick = () => {
    if (!whatsappNumber) {
      alert('Número de WhatsApp no configurado');
      return;
    }
    const message = encodeURIComponent('BINGO, BINGO!');
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <nav className="bg-unt-blue text-white shadow-2xl sticky top-0 z-50 border-b border-unt-yellow/10">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo y Título */}
          <Link to="/" className="flex items-center space-x-3 cursor-pointer">
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 overflow-hidden">
              <img 
                src={logoUrl || "https://api.trae.ai/api/v1/image/view/36979247-f58c-4f76-9f44-846101967268"} 
                alt="Logo PROM 28" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm sm:text-lg tracking-tight block leading-tight uppercase">System 28</span>
              <span className="text-[10px] font-bold text-unt-yellow tracking-widest uppercase opacity-80">Ing. Sistemas | UNT</span>
            </div>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2">
            <button 
              onClick={handleContactClick}
              className="px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 text-xs uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white"
            >
              <MessageCircle size={18} />
              <span>Contacto</span>
            </button>
            {user ? (
              <>
                <button
                  onClick={() => setView && setView('admin')}
                  className="px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 text-xs uppercase tracking-widest hover:bg-white/10 text-white/80"
                >
                  <LayoutDashboard size={18} />
                  <span>Panel</span>
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                  title="Cerrar Sesión"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setView && setView('login')}
                className="px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 text-xs uppercase tracking-widest bg-unt-yellow text-unt-blue shadow-lg shadow-unt-yellow/20 hover:bg-yellow-400"
              >
                <LayoutDashboard size={18} />
                <span>Iniciar Sesión</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button (Hamburger) */}
          <button 
            className="md:hidden p-2 rounded-xl bg-white/10 text-white"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="md:hidden bg-unt-blue border-t border-unt-yellow/10 py-4">
            <div className="space-y-2">
              <button 
                onClick={() => { handleContactClick(); setIsOpen(false); }}
                className="w-full p-4 rounded-2xl font-bold flex items-center space-x-4 text-sm uppercase tracking-widest bg-white/10 text-white"
              >
                <MessageCircle size={18} />
                <span>Contacto</span>
              </button>
              {user ? (
                <>
                  <button
                    onClick={() => {
                      setView && setView('admin');
                      setIsOpen(false);
                    }}
                    className="w-full p-4 rounded-2xl font-bold flex items-center space-x-4 text-sm uppercase tracking-widest bg-white/10 text-white/80"
                  >
                    <LayoutDashboard size={18} />
                    <span>Panel de Control</span>
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setIsOpen(false);
                    }}
                    className="w-full p-4 rounded-2xl font-bold flex items-center space-x-4 text-sm uppercase tracking-widest bg-red-500/10 text-red-500"
                  >
                    <LogOut size={18} />
                    <span>Cerrar Sesión</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setView && setView('login');
                    setIsOpen(false);
                  }}
                  className="w-full p-4 rounded-2xl font-bold flex items-center space-x-4 text-sm uppercase tracking-widest bg-unt-yellow text-unt-blue shadow-xl"
                >
                  <LayoutDashboard size={18} />
                  <span>Iniciar Sesión</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
