import React, { useState, useEffect } from 'react';
import BingoGrid from './BingoGrid';
import ChronologicalList from './ChronologicalList';
import BingoCard from './BingoCard';
import { List, Grid, Trophy, Clock, Award, CreditCard, Instagram, Music2, ChevronLeft } from 'lucide-react';

const PublicView = ({ gameState, prizes }) => {
  const [activeTab, setActiveTab] = useState('grid');
  const [selectedPrize, setSelectedPrize] = useState(null);

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
    }
  }, [gameState.prize]);

  const lastNumber = gameState.drawnNumbers[0];

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
          <p className="text-gray-500 font-semibold uppercase tracking-widest text-sm">¡Elige un premio y mira el sorteo!</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-10">
          {sortedPrizes.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-100 shadow-inner">
              <Clock size={64} className="mx-auto mb-6 text-gray-200" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xl">Pronto tendremos más premios...</p>
            </div>
          ) : (
            sortedPrizes.map(p => (
              <div 
                key={p.id} 
                onClick={() => setSelectedPrize(p)}
                className="group bg-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-xl hover:shadow-unt-yellow/20 transition-all cursor-pointer border-2 sm:border-4 border-transparent hover:border-unt-yellow hover:-translate-y-2"
              >
                <div className="aspect-square relative overflow-hidden bg-gray-50">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <Trophy size={60} className="sm:size-[120px]" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 sm:top-6 sm:right-6">
                    <span className={`text-[8px] sm:text-xs font-bold px-2 py-1 sm:px-5 sm:py-2.5 rounded-full uppercase tracking-widest shadow-xl border ${
                      p.status === 'finished' ? 'bg-gray-800 text-white border-gray-700' : 
                      p.status === 'active' ? 'bg-red-500 text-white border-red-400 animate-pulse' : 
                      'bg-unt-blue text-white border-unt-blue/50'
                    }`}>
                      {p.status === 'finished' ? 'Finalizado' : p.status === 'active' ? 'En Vivo' : 'Espera'}
                    </span>
                  </div>
                </div>
                <div className="p-4 sm:p-10 text-center">
                  <h3 className="text-sm sm:text-2xl font-black text-unt-blue uppercase mb-1 sm:mb-3 group-hover:text-unt-yellow transition-colors leading-tight line-clamp-1">{p.name}</h3>
                  <p className="hidden sm:block text-gray-500 text-sm font-medium line-clamp-2 mb-8 h-10">{p.description}</p>
                  
                  {p.status === 'finished' ? (
                    <div className="bg-green-50 p-2 sm:p-6 rounded-xl sm:rounded-3xl flex flex-col items-center space-y-1 sm:space-y-2 border-2 border-green-100">
                      <Award className="text-green-600 size-4 sm:size-8" />
                      <p className="text-[8px] sm:text-xs text-green-600 font-bold uppercase tracking-widest">¡Ganador!</p>
                      <p className="text-xs sm:text-xl font-black text-green-700 line-clamp-1">{p.winner_name}</p>
                    </div>
                  ) : (
                    <div className="inline-flex items-center bg-unt-blue text-unt-yellow px-4 py-2 sm:px-8 sm:py-4 rounded-lg sm:rounded-2xl font-bold text-[10px] sm:text-sm uppercase tracking-widest group-hover:bg-unt-yellow group-hover:text-unt-blue transition-all shadow-lg">
                      <span>¡VER!</span>
                      <ChevronLeft size={16} className="rotate-180 ml-1 sm:ml-3 group-hover:translate-x-2 transition-transform" />
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
  const isActivePrize = gameState.prize?.id === selectedPrize.id;

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
                <h3 className="text-2xl font-black text-unt-blue uppercase tracking-tight">¡Felicidades al Ganador!</h3>
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
      <div className={`rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden ${isActivePrize ? 'bg-gradient-to-br from-unt-blue to-night-blue' : 'bg-white border-2 sm:border-4 border-gray-100'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-unt-yellow/20 rounded-full -mr-32 -mt-32 sm:-mr-48 sm:-mt-48 blur-3xl animate-pulse"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-12 items-center">
          <div className="flex items-center space-x-4 sm:space-x-8">
            {selectedPrize.image_url && (
              <img src={selectedPrize.image_url} className={`w-24 h-24 sm:w-48 sm:h-48 rounded-[1.5rem] sm:rounded-[2.5rem] object-cover border-4 sm:border-8 shadow-2xl transform -rotate-2 sm:-rotate-3 transition-transform hover:rotate-0 duration-500 ${isActivePrize ? 'border-unt-yellow' : 'border-gray-100'}`} alt={selectedPrize.name} />
            )}
            <div className="text-left">
              {isActivePrize && (
                <span className="inline-block bg-unt-yellow text-unt-blue text-[10px] sm:text-xs font-bold px-3 py-1 sm:px-4 sm:py-1.5 rounded-full uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-2 sm:mb-4 animate-bounce shadow-lg shadow-unt-yellow/50">¡EN VIVO!</span>
              )}
              <h2 className={`text-xl sm:text-3xl font-black uppercase tracking-tight mb-1 sm:mb-3 leading-tight drop-shadow-md ${isActivePrize ? 'text-white' : 'text-unt-blue'}`}>{selectedPrize.name}</h2>
              <div className={`flex flex-col space-y-2 ${isActivePrize ? 'text-unt-yellow' : 'text-gray-400'}`}>
                <div className="flex items-center justify-start space-x-2 sm:space-x-3 font-bold uppercase text-[10px] sm:text-sm">
                  <Award size={16} sm:size={20} />
                  <span className="line-clamp-1">{selectedPrize.status === 'finished' ? `¡GANADOR: ${selectedPrize.winner_name}!` : 'Sorteo en curso'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className={`w-36 h-36 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center shadow-2xl border-[8px] sm:border-[12px] transform hover:scale-105 sm:hover:scale-110 transition-all duration-500 ${isActivePrize ? 'bg-white border-unt-yellow scale-100 sm:scale-105' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
              <span className="text-unt-blue/40 font-bold text-xl sm:text-3xl leading-none">{isActivePrize ? (lastNumber?.letter || '!') : '!'}</span>
              <span className="text-5xl sm:text-9xl font-black text-unt-blue leading-tight tracking-tighter">{isActivePrize ? (lastNumber?.number || '??') : '??'}</span>
            </div>
            <p className={`mt-3 sm:mt-6 text-[8px] sm:text-xs font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] ${isActivePrize ? 'text-white/60' : 'text-gray-300'}`}>Último Cantado</p>
          </div>

          <div className="flex flex-col items-center lg:items-end space-y-4 sm:space-y-6">
            <div className={`${isActivePrize ? 'bg-white/10' : 'bg-gray-100'} backdrop-blur-md px-6 py-4 sm:px-10 sm:py-6 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 sm:border-4 ${isActivePrize ? 'border-white/20' : 'border-gray-100'} text-center lg:text-right shadow-xl`}>
              <p className={`${isActivePrize ? 'text-white/60' : 'text-gray-500'} text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2`}>Total Cantados</p>
              <p className={`text-3xl sm:text-5xl font-black ${isActivePrize ? 'text-unt-yellow' : 'text-unt-blue'}`}>{isActivePrize ? gameState.drawnNumbers.length : 0}</p>
            </div>
            {selectedPrize.description && (
              <div className={`${isActivePrize ? 'bg-white/5' : 'bg-gray-50'} p-4 sm:p-6 rounded-2xl border ${isActivePrize ? 'border-white/10' : 'border-gray-100'} text-center lg:text-right`}>
                <p className={`${isActivePrize ? 'text-white/40' : 'text-gray-400'} text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-2`}>Descripción del Sorteo</p>
                <p className={`text-[10px] sm:text-xs font-medium leading-relaxed max-w-[250px] ${isActivePrize ? 'text-white/80' : 'text-gray-600'}`}>
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

          {activeTab === 'grid' ? (
            <BingoGrid drawnNumbers={isActivePrize ? gameState.drawnNumbers : []} />
          ) : activeTab === 'card' ? (
            <div className="space-y-6">
              <BingoCard drawnNumbers={isActivePrize ? gameState.drawnNumbers : []} activePrize={selectedPrize} />
            </div>
          ) : (
            <ChronologicalList drawnNumbers={isActivePrize ? gameState.drawnNumbers : []} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicView;
