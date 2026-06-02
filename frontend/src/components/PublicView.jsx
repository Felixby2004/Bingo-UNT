import React, { useState, useEffect } from 'react';
import BingoGrid from './BingoGrid';
import ChronologicalList from './ChronologicalList';
import BingoCard from './BingoCard';
import axios from 'axios';
import { List, Grid, Trophy, Clock, Award, CreditCard, Instagram, Music2, ChevronLeft } from 'lucide-react';

const PublicView = ({ gameState, prizes, selectedPrize, setSelectedPrize }) => {
  const [activeTab, setActiveTab] = useState('grid');
  const [selectedPrizeNumbers, setSelectedPrizeNumbers] = useState([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // If there's an active game, we might want to default to that prize
  useEffect(() => {
    if (gameState.prize && !selectedPrize) {
      setSelectedPrize(gameState.prize);
    }
  }, [gameState.prize]);

  // Sync with gameState updates if the selected prize is the one being played/finished
  useEffect(() => {
    if (gameState.prize && selectedPrize && gameState.prize.id === selectedPrize.id) {
      setSelectedPrize(gameState.prize);
      // Si es el premio activo, usamos los números del gameState
      setSelectedPrizeNumbers(gameState.drawnNumbers);
    }
  }, [gameState.prize, gameState.drawnNumbers]);

  // Fetch numbers for finished prizes
  useEffect(() => {
    const fetchHistory = async () => {
      if (selectedPrize && selectedPrize.status === 'finished') {
        // Solo buscamos historial si NO es el premio activo actual (o si queremos refrescarlo)
        // Pero para simplificar, si está finalizado, traemos su historia oficial
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
        // Si es el activo, sincronizamos con gameState
        setSelectedPrizeNumbers(gameState.drawnNumbers);
      } else {
        // En espera u otros estados
        setSelectedPrizeNumbers([]);
      }
    };

    fetchHistory();
  }, [selectedPrize?.id, selectedPrize?.status, gameState.prize?.id]);

  const lastNumber = selectedPrizeNumbers[0];

  const sortedPrizes = [...prizes].sort((a, b) => {
    // Si ambos están finalizados, por fecha de fin desc
    if (a.status === 'finished' && b.status === 'finished') {
      return new Date(b.finished_at) - new Date(a.finished_at);
    }
    // Si uno está activo, va primero
    if (a.status === 'active') return -1;
    if (b.status === 'active') return 1;
    // Si uno está finalizado, va después del activo pero antes que espera? 
    // O mejor: active > pending > finished
    const order = { 'active': 0, 'pending': 1, 'finished': 2 };
    return order[a.status] - order[b.status];
  });

  // If no prize is selected, show the prize selection screen
  if (!selectedPrize) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in duration-700">
        <div className="text-center space-y-3">
          <div className="inline-block bg-unt-yellow/20 p-3 rounded-full mb-1">
            <Trophy size={40} className="text-unt-yellow animate-bounce" />
          </div>
          <h2 className="text-4xl font-black text-unt-blue uppercase tracking-tight drop-shadow-sm">¡Premios!</h2>
          <p className="text-gray-600 font-semibold uppercase tracking-widest text-sm">¡Elige un premio y mira el sorteo!</p>
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
                onClick={() => setSelectedPrize(p)}
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
                <div className="p-3 sm:p-6 text-center flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm sm:text-xl font-black text-unt-blue uppercase mb-1 sm:mb-2 group-hover:text-unt-yellow transition-colors leading-tight line-clamp-1">{p.name}</h3>
                    <p className="hidden sm:block text-gray-600 text-xs font-medium line-clamp-2 mb-6">{p.description}</p>
                  </div>
                  
                  {p.status === 'finished' ? (
                    <div className="bg-green-50 p-2 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col items-center space-y-1 border border-green-100">
                      <Award className="text-green-600 size-4 sm:size-6" />
                      <p className="text-[8px] sm:text-[10px] text-green-600 font-black uppercase tracking-widest">¡Ganador!</p>
                      <p className="text-xs sm:text-lg font-black text-green-700 line-clamp-1">{p.winner_name}</p>
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center bg-unt-blue text-unt-yellow px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest group-hover:bg-unt-yellow group-hover:text-unt-blue transition-all shadow-lg">
                      <span>¡VER SORTEO!</span>
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

  // Prize Detail View (The original PublicView logic)
  const isActuallyPlaying = gameState.prize?.id === selectedPrize.id && selectedPrize.status === 'active';

  return (
    <div className="space-y-8 pb-20">
      <button 
        onClick={() => setSelectedPrize(null)}
        className="flex items-center space-x-2 text-unt-blue font-black text-xs uppercase tracking-widest hover:text-unt-yellow transition-colors"
      >
        <ChevronLeft size={16} />
        <span>Volver a Premios</span>
      </button>

      {/* Winner Banner if Finished */}
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

      {/* Real-time Game Banner or Static Prize Info */}
      <div className={`rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden ${isActuallyPlaying ? 'bg-gradient-to-br from-unt-blue to-night-blue' : 'bg-white border-2 sm:border-4 border-gray-100'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-unt-yellow/20 rounded-full -mr-32 -mt-32 sm:-mr-48 sm:-mt-48 blur-3xl animate-pulse"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-12 items-center">
          <div className="flex items-center space-x-4 sm:space-x-8">
            {selectedPrize.image_url && (
              <div className={`w-24 h-24 sm:w-64 sm:h-64 rounded-[1.5rem] sm:rounded-[2.5rem] bg-white border-4 sm:border-8 shadow-2xl overflow-hidden flex items-center justify-center transition-all duration-500 ${isActuallyPlaying ? 'border-unt-yellow' : 'border-gray-100'}`}>
                <img 
                  src={selectedPrize.image_url} 
                  className="w-full h-full object-contain p-1" 
                  alt={`Imagen detallada del premio: ${selectedPrize.name}`}
                  loading="lazy"
                />
              </div>
            )}
            <div className="text-left">
              {isActuallyPlaying && (
                <span className="inline-block bg-unt-yellow text-unt-blue text-[10px] sm:text-xs font-bold px-3 py-1 sm:px-4 sm:py-1.5 rounded-full uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-2 sm:mb-4 animate-bounce shadow-lg shadow-unt-yellow/50">¡EN VIVO!</span>
              )}
              <h2 className={`text-xl sm:text-3xl font-black uppercase tracking-tight mb-1 sm:mb-3 leading-tight drop-shadow-md ${isActuallyPlaying ? 'text-white' : 'text-unt-blue'}`}>{selectedPrize.name}</h2>
              <div className={`flex flex-col space-y-2 ${isActuallyPlaying ? 'text-unt-yellow' : 'text-gray-600'}`}>
                <div className="flex items-center justify-start space-x-2 sm:space-x-3 font-bold uppercase text-[10px] sm:text-sm">
                  <Award size={16} sm:size={20} />
                  <span className="line-clamp-1">{selectedPrize.status === 'finished' ? `¡GANADOR: ${selectedPrize.winner_name}!` : 'Sorteo en curso'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className={`w-36 h-36 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center shadow-2xl border-[8px] sm:border-[12px] transform hover:scale-105 sm:hover:scale-110 transition-all duration-500 ${isActuallyPlaying ? 'bg-white border-unt-yellow scale-100 sm:scale-105' : 'bg-gray-50 border-gray-100'}`}>
              <span className="text-unt-blue/40 font-bold text-xl sm:text-3xl leading-none">{(isActuallyPlaying || selectedPrize.status === 'finished') ? (lastNumber?.letter || '!') : '!'}</span>
              <span className="text-5xl sm:text-9xl font-black text-unt-blue leading-tight tracking-tighter">{(isActuallyPlaying || selectedPrize.status === 'finished') ? (lastNumber?.number || '??') : '??'}</span>
            </div>
            <p className={`mt-3 sm:mt-6 text-[8px] sm:text-xs font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] ${isActuallyPlaying ? 'text-white/70' : 'text-gray-500'}`}>Último Cantado</p>
          </div>

          <div className="flex flex-col items-center lg:items-end space-y-4 sm:space-y-6">
            <div className={`${isActuallyPlaying ? 'bg-white/10' : 'bg-gray-100'} backdrop-blur-md px-6 py-4 sm:px-10 sm:py-6 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 sm:border-4 ${isActuallyPlaying ? 'border-white/20' : 'border-gray-100'} text-center lg:text-right shadow-xl`}>
              <p className={`${isActuallyPlaying ? 'text-white/70' : 'text-gray-600'} text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2`}>Total Cantados</p>
              <p className={`text-3xl sm:text-5xl font-black ${isActuallyPlaying ? 'text-unt-yellow' : 'text-unt-blue'}`}>{selectedPrizeNumbers.length}</p>
            </div>
            {selectedPrize.description && (
              <div className={`${isActuallyPlaying ? 'bg-white/5' : 'bg-gray-50'} p-4 sm:p-6 rounded-2xl border ${isActuallyPlaying ? 'border-white/10' : 'border-gray-100'} text-center lg:text-right`}>
                <p className={`${isActuallyPlaying ? 'text-white/60' : 'text-gray-500'} text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-2`}>
                  Descripción del Sorteo
                </p>

                <p
                  className={`text-[10px] sm:text-xs font-medium leading-relaxed max-w-[250px] text-justify ${
                    isActuallyPlaying ? 'text-white/90' : 'text-gray-700'
                  }`}
                >
                  {selectedPrize.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Tabbed Bingo View */}
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
