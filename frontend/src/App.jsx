import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Home from './components/Home';
import BingoLanding from './components/BingoLanding';
import BingoGame from './components/BingoGame';
import Footer from './components/Footer';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout><Home /></MainLayout>} />
      <Route path="/bingo" element={<MainLayout><BingoLanding /></MainLayout>} />
      <Route path="/bingo/game" element={<BingoGame />} />
    </Routes>
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
    <div className="min-h-screen bg-unt-light flex flex-col font-sans text-unt-black">
      <NavbarForRoutes logoUrl={logoUrl} />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer logoUrl={logoUrl} />
    </div>
  );
}

function NavbarForRoutes({ logoUrl }) {
  const [isOpen, setIsOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const navigate = useNavigate();

  const events = [
    { name: 'Bingo 28', path: '/bingo' },
  ];

  return (
    <nav className="bg-unt-primary text-unt-white shadow-2xl sticky top-0 z-50 border-b border-unt-accent/10">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={logoUrl}
                alt="Logo PROM 28"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm sm:text-lg tracking-tight block leading-none uppercase">Promo XXVIII</span>
              <span className="text-[10px] font-bold text-unt-accent tracking-widest uppercase opacity-80">Ingeniería de Sistemas</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setEventsOpen(!eventsOpen)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all text-xs uppercase tracking-widest hover:bg-white/5"
              >
                <span>Eventos</span>
                <svg className={`w-4 h-4 transition-transform ${eventsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {eventsOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-unt-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  {events.map((event, idx) => (
                    <Link
                      key={idx}
                      to={event.path}
                      onClick={() => setEventsOpen(false)}
                      className="block px-4 py-3 text-sm font-bold text-gray-700 hover:bg-unt-light hover:text-unt-primary"
                    >
                      {event.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/bingo/game"
              className="px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest bg-unt-accent text-unt-white shadow-lg shadow-unt-accent/20 hover:opacity-90 transition-opacity"
            >
              Bingo
            </Link>
          </div>

          <button
            className="md:hidden p-2 rounded-xl bg-white/5 text-unt-white"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-unt-primary border-t border-white/10 animate-in slide-in-from-top duration-300">
          <div className="container mx-auto px-4 py-6 space-y-4">
            <Link to="/" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-sm font-bold text-unt-white uppercase tracking-widest rounded-xl hover:bg-white/5">Inicio</Link>
            <Link to="/bingo" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-sm font-bold text-unt-white uppercase tracking-widest rounded-xl hover:bg-white/5">Bingo 28</Link>
            <Link to="/bingo/game" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-sm font-bold text-unt-accent uppercase tracking-widest rounded-xl bg-unt-accent/20">Ir al Bingo</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

export default App;