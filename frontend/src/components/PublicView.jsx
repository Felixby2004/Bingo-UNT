import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import BingoGrid from './BingoGrid';
import ChronologicalList from './ChronologicalList';
import BingoCard from './BingoCard';
import axios from 'axios';
import { List, Grid, Trophy, Clock, Award, CreditCard, ChevronLeft, Calendar } from 'lucide-react';

const PublicView = ({ gameState, prizes, selectedPrize, setSelectedPrize, showPrizes, setShowPrizes }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('grid');
  const [selectedPrizeNumbers, setSelectedPrizeNumbers] = useState([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  
  // Fecha del evento: 10 de Julio de 2026, 14:00
  const eventDate = new Date('2026-07-10T14:00:00');
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0, 
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = eventDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        // If time is up, stop the timer
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        });
        clearInterval(timer);
      }
    };

    let timer;
    calculateTimeLeft();
    timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Sync selectedPrize with search params
  useEffect(() => {
    const prizeId = searchParams.get('prize');
    if (prizeId) {
      const prize = prizes.find(p => p.id === parseInt(prizeId) || p.id === prizeId);
      if (prize && (!selectedPrize || selectedPrize.id !== prize.id)) {
        setSelectedPrize(prize);
        setShowPrizes(true);
      }
    } else if (selectedPrize) {
      setSelectedPrize(null);
      setShowPrizes(true);
    }
  }, [searchParams, prizes, selectedPrize, setSelectedPrize, setShowPrizes]);

  // If there's an active game, we might want to default to that prize
  useEffect(() => {
    if (gameState.prize && !selectedPrize && !searchParams.get('prize')) {
      setSearchParams({ prize: gameState.prize.id }, { replace: true });
      setShowPrizes(true);
    }
  }, [gameState.prize, setSelectedPrize, searchParams, setSearchParams]);

  // Sync with gameState updates if the selected prize is the one being played/finished
  useEffect(() => {
    if (gameState.prize && selectedPrize && gameState.prize.id === selectedPrize.id) {
      setSelectedPrize(gameState.prize);
      setSelectedPrizeNumbers(gameState.drawnNumbers);
    }
  }, [gameState.prize, gameState.drawnNumbers, selectedPrize, setSelectedPrize]);

  // Fetch numbers for finished prizes
  useEffect(() => {
    const fetchHistory = async () => {
      if (selectedPrize && selectedPrize.status === 'finished') {
        setLoadingNumbers(true);
        try {
          const res = await axios.get(`${apiUrl}/api/prizes/${selectedPrize.id}/history`);
          setSelectedPrizeNumbers(res.data.drawnNumbers || []);
        } catch (err) {
          console.error('Error fetching prize history:', err);
        } finally {
          setLoadingNumbers(false);
        }
      } else if (selectedPrize && selectedPrize.status === 'active' && gameState.prize?.id === selectedPrize.id) {
        setSelectedPrizeNumbers(gameState.drawnNumbers);
      } else {
        setSelectedPrizeNumbers([]);
      }
    };

    fetchHistory();
  }, [selectedPrize?.id, selectedPrize?.status, gameState.prize?.id, apiUrl, gameState.drawnNumbers]);

  const lastNumber = selectedPrizeNumbers[0];

  const sortedPrizes = [...prizes].sort((a, b) => {
    if (a.status === 'finished' && b.status === 'finished') {
      return new Date(b.finished_at) - new Date(a.finished_at);
    }
    if (a.status === 'active') return -1;
    if (b.status === 'active') return 1;
    const order = { 'active': 0, 'pending': 1, 'finished': 2 };
    return order[a.status] - order[b.status];
  });

  // Si se está mostrando los premios pero no hay uno seleccionado
  if (showPrizes && !selectedPrize) {
    return (
      <div className="space-y-8 pb-8 animate-in fade-in duration-700">
        {/* Small event info & countdown */}
        <div className="space-y-4">
          {/* Countdown */}
          <div className="flex justify-center gap-2 sm:gap-4 px-2">
            {Object.entries(timeLeft).map(([unit, value], index) => (
              <div 
                key={unit}
                className={`rounded-xl px-1 py-3 sm:p-4 text-center shadow-lg w-[4.5rem] sm:w-24 flex flex-col justify-center items-center ${
                  index % 2 === 0 ? 'bg-unt-blue text-white' : 'bg-unt-yellow text-unt-blue'
                }`}
              >
                <div className="text-xl sm:text-3xl font-black tabular-nums leading-none">
                  {String(value).padStart(2, '0')}
                </div>
                
                <div className="text-[9px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest opacity-90 mt-1 sm:mt-2">
                  {unit === 'days' ? 'Días' : unit === 'hours' ? 'Horas' : unit === 'minutes' ? 'Minutos' : 'Segundos'}
                </div>
              </div>
            ))}
          </div>
          
          {/* Event details */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-center">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-unt-blue" />
              <p className="text-xs sm:text-sm font-bold text-gray-700">10 de Julio de 2026</p>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-unt-blue" />
              <p className="text-xs sm:text-sm font-bold text-gray-700">2:00 PM</p>
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-unt-blue" />
              <p className="text-xs sm:text-sm font-bold text-gray-700">Losa Ciencias Económicas (UNT)</p>
            </div>
          </div>
        </div>
        
        <div className="text-center space-y-3 pt-2">
          <div className="inline-block bg-unt-yellow/20 p-3 rounded-full mb-1">
            <Trophy size={32} className="text-unt-yellow animate-bounce" />
          </div>
          <h2 className="text-3xl font-black text-unt-blue uppercase tracking-tight drop-shadow-sm">¡Premios!</h2>
          <p className="text-gray-600 font-semibold uppercase tracking-widest text-xs sm:text-sm">¡Elige un premio y mira el sorteo!</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-10">
          {sortedPrizes.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-100 shadow-inner">
              <Clock size={64} className="mx-auto mb-6 text-gray-200" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xl">Pronto tendremos más premios...</p>
            </div>
          ) : (
            sortedPrizes.map(p => (
              <div 
                key={p.id} 
                onClick={() => setSearchParams({ prize: p.id })}
                className="group bg-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-xl hover:shadow-unt-yellow/20 transition-all cursor-pointer border-2 sm:border-4 border-transparent hover:border-unt-yellow hover:-translate-y-2 flex flex-col p-3 sm:p-4"
              >
                <div className="aspect-[4/3] sm:aspect-video relative overflow-hidden bg-white rounded-[1.5rem] sm:rounded-[2.5rem] flex items-center justify-center border border-gray-50">
                  {p.image_url ? (
                    <img 
                      src={p.image_url} 
                      alt={`Imagen del premio: ${p.name}`} 
                      className="w-full h-full object-contain transition-transform duration-700" 
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Trophy size={60} className="sm:size-[100px]" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
                    <span className={`text-[7px] sm:text-[10px] font-black px-2 py-1 sm:px-4 sm:py-2 rounded-full uppercase tracking-widest shadow-2xl border backdrop-blur-md ${
                      p.status === 'finished' ? 'bg-gray-900/80 text-white border-white/20' : 
                      p.status === 'active' ? 'bg-red-600/90 text-white border-white/20 animate-pulse' : 
                      'bg-unt-blue/90 text-white border-white/20'
                    }`}>
                      {p.status === 'finished' ? 'Finalizado' : p.status === 'active' ? 'En Vivo' : 'Espera'}
                    </span>
                  </div>
                </div>
                <div className="p-5 sm:p-8 text-center flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm sm:text-xl font-black text-unt-blue uppercase mb-3 group-hover:text-unt-yellow transition-colors leading-tight line-clamp-2">{p.name}</h3>
                  </div>
                  
                  {p.status === 'finished' ? (
                    <div className="bg-green-50 p-2 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col items-center space-y-1 border border-green-100">
                      <Award className="text-green-600 size-4 sm:size-6" />
                      <p className="text-[8px] sm:text-[10px] text-green-600 font-black uppercase tracking-widest">¡Ganador!</p>
                      <p className="text-xs sm:text-lg font-black text-green-700 line-clamp-1">{p.winner_name}</p>
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center bg-unt-blue text-unt-yellow px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest group-hover:bg-unt-yellow group-hover:text-unt-blue transition-all shadow-lg">
                      <span>¡Ver Sorteo!</span>
                      <ChevronLeft size={14} className="rotate-180 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Prize Detail View (vista de sorteo)
  const isActuallyPlaying = gameState.prize?.id === selectedPrize.id && selectedPrize.status === 'active';

  return (
    <div className="space-y-8 pb-8">
      <button 
        onClick={() => {
          navigate('.', { replace: true });
          setSelectedPrize(null);
          setShowPrizes(true);
        }}
        className="flex items-center space-x-2 text-unt-blue font-black text-xs uppercase tracking-widest hover:text-unt-yellow transition-colors"
      >
        <ChevronLeft size={16} />
        <span>Volver a Premios</span>
      </button>

      {selectedPrize.status === 'finished' && (
        <div className="bg-white border-2 border-green-500/30 rounded-[2rem] p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20 rotate-3 group-hover:rotate-0 transition-transform">
                <Trophy size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-1">Sorteo Finalizado</p>
                <h3 className="text-2xl font-black text-unt-blue uppercase tracking-tight">¡Felicidades al Ganador(a)!</h3>
              </div>
            </div>
            <div className="bg-green-500 text-white px-10 py-4 rounded-2xl shadow-xl shadow-green-500/20 transform hover:scale-[1.02] transition-all">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1 text-center">Nombre del Ganador</p>
              <p className="text-2xl font-black uppercase text-center">{selectedPrize.winner_name}</p>
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-8 shadow-2xl relative overflow-hidden ${isActuallyPlaying ? 'bg-gradient-to-b from-unt-blue to-night-blue' : 'bg-white border-2 sm:border-4 border-gray-100'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-unt-yellow/20 rounded-full -mr-32 -mt-32 sm:-mr-48 sm:-mt-48 blur-3xl animate-pulse"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
          
          <div className="flex items-center space-x-4 sm:space-x-6 w-full lg:w-1/3">
            {selectedPrize.image_url && (
              <div className={`flex-shrink-0 w-20 h-20 sm:w-40 sm:h-40 rounded-[1.2rem] sm:rounded-[2rem] bg-white border-4 sm:border-6 shadow-xl overflow-hidden flex items-center justify-center transition-all duration-500 ${isActuallyPlaying ? 'border-unt-yellow' : 'border-gray-100'}`}>
                <img 
                  src={selectedPrize.image_url} 
                  className="w-full h-full object-contain p-1.5" 
                  alt={`Imagen detallada del premio: ${selectedPrize.name}`}
                  loading="lazy"
                />
              </div>
            )}
            <div className="text-left flex-grow">
              {isActuallyPlaying && (
                <span className="inline-block bg-unt-yellow text-unt-blue text-[8px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase tracking-widest mb-1 sm:mb-2 animate-bounce shadow-lg shadow-unt-yellow/50">¡En Vivo!</span>
              )}
              <h2 className={`text-sm sm:text-xl lg:text-2xl font-black uppercase tracking-tight mb-1 leading-tight drop-shadow-md ${isActuallyPlaying ? 'text-white' : 'text-unt-blue'}`}>
                {selectedPrize.name}
              </h2>
              <div className={`flex items-center space-x-1.5 font-bold uppercase text-[9px] sm:text-xs ${isActuallyPlaying ? 'text-unt-yellow' : 'text-gray-500'}`}>
                <Award size={14} />
                <span className="line-clamp-1">{selectedPrize.status === 'finished' ? `GANADOR: ${selectedPrize.winner_name}` : 'Sorteo en curso'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center lg:w-1/4">
            <div className={`w-32 h-32 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center shadow-2xl border-[6px] sm:border-[10px] transform transition-all duration-500 ${isActuallyPlaying ? 'bg-white border-unt-yellow' : 'bg-gray-50 border-gray-100'}`}>
              <span className="text-unt-blue/40 font-bold text-lg sm:text-2xl leading-none">{(isActuallyPlaying || selectedPrize.status === 'finished') ? (lastNumber?.letter || '!') : '!'}</span>
              <span className="text-4xl sm:text-7xl font-black text-unt-blue leading-tight tracking-tighter">{(isActuallyPlaying || selectedPrize.status === 'finished') ? (lastNumber?.number || '??') : '??'}</span>
            </div>
            <p className={`mt-2 sm:mt-4 text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.4em] ${isActuallyPlaying ? 'text-white/60' : 'text-gray-400'}`}>Último Cantado</p>
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-1/3">
            <div className={`flex items-center justify-between ${isActuallyPlaying ? 'bg-white/10' : 'bg-gray-100'} backdrop-blur-md px-5 py-3 rounded-2xl border ${isActuallyPlaying ? 'border-white/20' : 'border-gray-100'}`}>
              <p className={`${isActuallyPlaying ? 'text-white/60' : 'text-gray-500'} text-[10px] sm:text-xs font-black uppercase tracking-widest`}>Total Cantados</p>
              <p className={`text-xl sm:text-2xl font-black ${isActuallyPlaying ? 'text-unt-yellow' : 'text-unt-blue'}`}>{selectedPrizeNumbers.length}</p>
            </div>
            
            {selectedPrize.description && (
              <div className={`w-full ${isActuallyPlaying ? 'bg-white/5' : 'bg-gray-50'} p-4 rounded-2xl border ${isActuallyPlaying ? 'border-white/10' : 'border-gray-100'}`}>
                <p className={`${isActuallyPlaying ? 'text-white/40' : 'text-gray-400'} text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-1.5 lg:text-right`}>Descripción</p>
                <p className={`text-[10px] sm:text-xs font-medium leading-relaxed lg:text-right ${isActuallyPlaying ? 'text-white/90' : 'text-gray-700'}`}>
                  {selectedPrize.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-unt-blue uppercase tracking-tight flex items-center space-x-2">
              <Grid size={20} className="text-unt-yellow" />
              <span>Control de Cartilla</span>
            </h3>
            <div className="flex bg-gray-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveTab('grid')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'grid' ? 'bg-white text-unt-blue shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid size={14} />
                <span className="hidden sm:inline">TABLERO</span>
              </button>
              <button 
                onClick={() => setActiveTab('card')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'card' ? 'bg-white text-unt-blue shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <CreditCard size={14} />
                <span className="hidden sm:inline">PATRÓN</span>
              </button>
              <button 
                onClick={() => setActiveTab('list')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'list' ? 'bg-white text-unt-blue shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={14} />
                <span className="hidden sm:inline">LISTA</span>
              </button>
            </div>
          </div>

          {loadingNumbers ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] shadow-xl border-4 border-dashed border-gray-50">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-unt-blue mb-4"></div>
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Cargando datos del sorteo...</p>
            </div>
          ) : activeTab === 'grid' ? (
            <BingoGrid drawnNumbers={selectedPrizeNumbers} />
          ) : activeTab === 'card' ? (
            <div className="space-y-6">
              <BingoCard drawnNumbers={selectedPrizeNumbers} activePrize={selectedPrize} />
            </div>
          ) : (
            <ChronologicalList drawnNumbers={selectedPrizeNumbers} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicView;
