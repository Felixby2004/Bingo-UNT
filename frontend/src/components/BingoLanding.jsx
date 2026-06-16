import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BingoLanding = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Target date: July 3, 2026
  const targetDate = new Date('2026-07-03T00:00:00');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const countdownItems = [
    { label: 'Días', value: countdown.days },
    { label: 'Horas', value: countdown.hours },
    { label: 'Minutos', value: countdown.minutes },
    { label: 'Segundos', value: countdown.seconds },
  ];

  return (
    <div className="space-y-16 pb-16 animate-in fade-in duration-700">
      {/* Hero Section with Countdown */}
      <section className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-unt-primary to-unt-night p-8 sm:p-16 text-center text-unt-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-unt-accent/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-unt-accent/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-unt-accent/20 px-6 py-2 rounded-full mb-6">
            <span className="text-unt-accent font-black text-xs uppercase tracking-widest">🎯 Evento Especial</span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tight mb-4">
            BINGO <span className="text-unt-accent">28</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-unt-white/80 mb-10 max-w-2xl mx-auto">
            ¡El evento más esperado de la promoción está por llegar!
          </p>

          {/* Countdown */}
          <div className="flex justify-center gap-4 sm:gap-8 mb-10">
            {countdownItems.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-unt-white rounded-2xl sm:rounded-3xl shadow-2xl flex items-center justify-center border-4 border-unt-accent">
                  <span className="text-4xl sm:text-5xl font-black text-unt-primary">
                    {String(item.value).padStart(2, '0')}
                  </span>
                </div>
                <span className="mt-3 text-sm font-bold text-unt-white/70 uppercase tracking-widest">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Go to Event Button */}
          <button
            onClick={() => navigate('/bingo/game')}
            className="inline-flex items-center space-x-3 bg-unt-accent text-unt-white px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-105 transition-all duration-300 shadow-xl shadow-unt-accent/40"
          >
            <span>IR AL EVENTO</span>
            <span>→</span>
          </button>
        </div>
      </section>

      {/* Event Info Section */}
      <section className="grid md:grid-cols-2 gap-8">
        {/* Flyer */}
        <div className="bg-unt-white rounded-[3rem] p-6 shadow-xl border-4 border-unt-light">
          <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-unt-primary to-unt-night flex items-center justify-center">
            <div className="text-center p-8">
              <span className="text-6xl mb-4 block">🎲</span>
              <h3 className="text-3xl font-black text-unt-white uppercase tracking-tight">BINGO 28</h3>
              <p className="text-unt-accent font-bold mt-2">Flyer Oficial</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div className="bg-unt-white rounded-[2.5rem] p-8 shadow-xl border-4 border-unt-light">
            <h2 className="text-2xl font-black text-unt-primary uppercase tracking-tight mb-6">Información del Evento</h2>
            
            <div className="space-y-5">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-unt-accent/20 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl">📅</span>
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Fecha</p>
                  <p className="text-xl font-bold text-unt-primary">3 de Julio de 2026</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-unt-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl">⏰</span>
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Hora</p>
                  <p className="text-xl font-bold text-unt-primary">7:00 PM</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl">📍</span>
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Lugar</p>
                  <p className="text-xl font-bold text-unt-primary">Transmisión en Vivo</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-unt-accent to-orange-400 rounded-[2.5rem] p-8 shadow-xl">
            <p className="text-unt-white text-lg font-bold text-center">
              ¡No te pierdas la oportunidad de ganar increíbles premios y compartir con toda la promoción!
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BingoLanding;