import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { History, Calendar, Award, ChevronRight, Trophy } from 'lucide-react';

const HistoryView = () => {
  const [history, setHistory] = useState([]);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/prizes`);
      // Filter finished prizes for history
      setHistory(res.data.filter(p => p.status === 'finished'));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPrizeDetails = async (id) => {
    try {
      const res = await axios.get(`${apiUrl}/api/prizes/${id}/history`);
      setSelectedPrize(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar: Finished Prizes */}
      <div className="lg:col-span-4 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-unt-blue p-6 text-unt-yellow font-black flex items-center space-x-2 uppercase text-xs tracking-widest">
          <History size={18} />
          <span>Partidas Finalizadas</span>
        </div>
        <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-50">
          {history.length === 0 ? (
            <div className="p-12 text-center text-gray-300 italic text-sm">No hay historial disponible</div>
          ) : (
            history.map(p => (
              <button 
                key={p.id}
                onClick={() => fetchPrizeDetails(p.id)}
                className={`w-full p-6 text-left hover:bg-unt-yellow/5 transition-all flex justify-between items-center group ${selectedPrize?.prize.id === p.id ? 'bg-unt-yellow/10 border-r-4 border-unt-yellow' : ''}`}
              >
                <div>
                  <h4 className="font-black text-unt-blue text-sm uppercase group-hover:text-unt-blue/80 transition-colors">{p.name}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar size={10} className="text-gray-400" />
                    <span className="text-[10px] text-gray-400 font-bold">{moment(p.finished_at).tz('America/Lima').format('DD/MM/YYYY')}</span>
                  </div>
                </div>
                <ChevronRight size={16} className={`text-gray-200 group-hover:text-unt-yellow transition-all ${selectedPrize?.prize.id === p.id ? 'translate-x-1 text-unt-yellow' : ''}`} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content: Prize Details */}
      <div className="lg:col-span-8">
        {selectedPrize ? (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-gray-50 pb-8">
              <div>
                <span className="inline-block bg-gray-100 text-gray-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-3">Resumen de Partida</span>
                <h2 className="text-4xl font-black text-unt-blue uppercase tracking-tight mb-2">{selectedPrize.prize.name}</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1 text-unt-yellow/80 font-bold uppercase text-[10px]">
                    <Award size={14} />
                    <span>{selectedPrize.prize.game_style}</span>
                  </div>
                  <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase">
                    Finalizada: {moment(selectedPrize.prize.finished_at).tz('America/Lima').format('HH:mm:ss')}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 px-6 py-4 rounded-3xl border border-green-100 flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 shadow-inner">
                  <Trophy size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-green-600/60 font-black uppercase tracking-widest leading-none mb-1">Ganador</p>
                  <p className="text-xl font-black text-green-700">{selectedPrize.prize.winner_name}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Números Cantados ({selectedPrize.drawnNumbers.length})</h3>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {selectedPrize.drawnNumbers.map((n, idx) => (
                  <div key={idx} className="aspect-square flex flex-col items-center justify-center bg-gray-50 border border-gray-100 rounded-2xl p-2 hover:bg-white hover:shadow-md transition-all cursor-default group">
                    <span className="text-[8px] font-black text-gray-300 group-hover:text-unt-blue/40 transition-colors leading-none">{n.letter}</span>
                    <span className="text-xl font-black text-unt-blue leading-tight">{n.number}</span>
                    <span className="text-[8px] text-gray-300 font-bold mt-1">{moment(n.drawn_at).tz('America/Lima').format('HH:mm')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Sistema de Auditoría Bingo UNT</p>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 text-gray-300">
            <History size={64} className="mb-4 opacity-10" />
            <p className="font-black uppercase tracking-widest text-sm">Selecciona una partida para revisar los resultados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
