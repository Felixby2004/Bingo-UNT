import React from 'react';
import moment from 'moment-timezone';
import { Clock } from 'lucide-react';

const ChronologicalList = ({ drawnNumbers }) => {
  if (drawnNumbers.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl border-2 border-dashed border-gray-200 text-center text-gray-400">
        Esperando el primer número...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-unt-blue/5 overflow-hidden">
      <div className="bg-unt-blue p-3 text-unt-yellow font-bold flex items-center justify-between">
        <span>Historial Reciente</span>
        <Clock size={16} />
      </div>
      <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
        {drawnNumbers.map((item, index) => (
          <div 
            key={item.id || index} 
            className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${index === 0 ? 'bg-unt-yellow/10' : ''}`}
          >
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl shadow-md ${
                index === 0 ? 'bg-unt-yellow text-unt-blue animate-bounce' : 'bg-unt-blue text-unt-white'
              }`}>
                {item.number}
              </div>
              <div>
                <div className="font-bold text-unt-blue">Letra {item.letter}</div>
              </div>
            </div>
            {index === 0 && (
              <span className="text-[10px] bg-unt-blue text-unt-yellow px-2 py-1 rounded-full font-bold animate-pulse uppercase">
                Último
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChronologicalList;
