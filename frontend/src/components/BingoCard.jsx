import React from 'react';

const BingoCard = ({ drawnNumbers, activePrize }) => {
  const pattern = activePrize?.winning_pattern || Array(25).fill(true);

  const isPatternSquare = (rowIndex, cellIndex) => {
    const index = rowIndex * 5 + cellIndex;
    return pattern[index];
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-md mx-auto">
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {Array(5).fill(null).map((_, rowIndex) => (
          Array(5).fill(null).map((_, cellIndex) => {
            const isValid = isPatternSquare(rowIndex, cellIndex);
            const isFree = rowIndex === 2 && cellIndex === 2;
            
            return (
              <div 
                key={`${rowIndex}-${cellIndex}`}
                className={`aspect-square flex items-center justify-center rounded-xl sm:rounded-2xl transition-all border-2 ${
                  isFree 
                  ? 'bg-unt-blue text-unt-yellow border-unt-blue shadow-inner' 
                  : isValid
                    ? 'bg-unt-yellow border-unt-yellow shadow-md scale-105 z-10'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                {isFree && (
                  <div className="flex flex-col items-center">
                    <span className="text-[12px] uppercase leading-none mb-0.5">CONTROL</span>
                    <span className="text-[10px] leading-none font-black">XXXX</span>
                  </div>
                )}
              </div>
            );
          })
        ))}
      </div>
      <div className="mt-8 flex items-center justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-unt-yellow rounded-md shadow-sm"></div>
          <span className="text-[10px] font-black text-unt-blue uppercase tracking-widest">Válido (Pintado Amarillo)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-50 border border-gray-100 rounded-md"></div>
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No válido</span>
        </div>
      </div>
    </div>
  );
};

export default BingoCard;
