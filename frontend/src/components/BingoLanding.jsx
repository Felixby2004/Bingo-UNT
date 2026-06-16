import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BingoLanding = () => {
  const navigate = useNavigate();
  
  // Fecha del evento: 3 de Julio de 2026, 14:00
  const eventDate = new Date('2026-07-03T14:00:00');
  
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
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16">
        {/* Title Section with Dark Background */}
        <div className="bg-gradient-to-b from-unt-blue to-night-blue rounded-[2rem] p-8 mb-12">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4">
              Próximo Bingo
            </h1>
            <p className="text-xl md:text-2xl font-bold text-unt-yellow">
              ¡No te lo pierdas!
            </p>
          </div>
        </div>

        {/* Countdown Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid grid-cols-4 gap-4 md:gap-8">
            {Object.entries(timeLeft).map(([unit, value]) => (
              <div key={unit} className="bg-gray-100 rounded-2xl p-6 md:p-8 text-center border-2 border-unt-blue">
                <div className="text-4xl md:text-6xl font-black text-unt-blue">
                  {String(value).padStart(2, '0')}
                </div>
                <div className="text-gray-600 font-bold uppercase tracking-widest text-sm md:text-lg mt-2">
                  {unit === 'days' ? 'Días' : unit === 'hours' ? 'Horas' : unit === 'minutes' ? 'Minutos' : 'Segundos'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Details */}
        <div className="max-w-3xl mx-auto bg-gray-50 rounded-[2rem] p-8 md:p-12 shadow-xl mb-12 border-2 border-gray-200">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="bg-unt-blue p-4 rounded-xl">
                <Calendar size={32} className="text-unt-yellow" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-unt-blue uppercase">Fecha</h3>
                <p className="text-gray-600 font-bold text-lg">3 de Julio de 2026</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-unt-blue p-4 rounded-xl">
                <Clock size={32} className="text-unt-yellow" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-unt-blue uppercase">Hora</h3>
                <p className="text-gray-600 font-bold text-lg">2:00 PM</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-unt-blue p-4 rounded-xl">
                <Trophy size={32} className="text-unt-yellow" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-unt-blue uppercase">Lugar</h3>
                <p className="text-gray-600 font-bold text-lg">Loza Ciencias Económicas (UNT)</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <button 
            onClick={() => navigate('/bingo/game')}
            className="bg-unt-blue text-unt-yellow px-12 py-6 rounded-xl font-black text-2xl uppercase hover:scale-105 transition-transform shadow-2xl flex items-center gap-3 mx-auto"
          >
            ¡Ir al Bingo!
            <ChevronRight size={32} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BingoLanding;
