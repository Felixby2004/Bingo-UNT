import React from 'react';

const BingoGrid = ({ drawnNumbers }) => {
  // Logic for a 5x5 Bingo board (B-I-N-G-O)
  // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
  const columns = [
    { letter: 'B', range: [1, 15] },
    { letter: 'I', range: [16, 30] },
    { letter: 'N', range: [31, 45] },
    { letter: 'G', range: [46, 60] },
    { letter: 'O', range: [61, 75] },
  ];

  const isDrawn = (num) => drawnNumbers.some(n => n.number === num);

  return (
    <div className="bg-white p-3 sm:p-6 rounded-[3rem] shadow-2xl border-4 border-gray-50 overflow-hidden">
      <div className="grid grid-cols-5 gap-2 sm:gap-4">
        {columns.map((col) => (
          <div key={col.letter} className="flex flex-col space-y-2">
            <div className="w-full h-10 sm:h-14 flex items-center justify-center bg-unt-blue text-unt-yellow rounded-2xl font-black text-2xl sm:text-3xl shadow-lg mb-2 transform -rotate-2">
              {col.letter}
            </div>
            <div className="flex flex-col space-y-1 sm:space-y-1.5">
              {/* For a full 1-75 display, we list all 15 numbers per column */}
              {Array.from({ length: 15 }, (_, i) => col.range[0] + i).map((num) => (
                <div
                  key={num}
                  className={`flex items-center justify-center py-2 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all duration-500 border-2 ${
                    isDrawn(num) 
                    ? 'bg-unt-yellow text-unt-blue border-unt-yellow scale-110 shadow-lg z-10 rotate-2' 
                    : 'bg-gray-50 text-gray-300 border-gray-100 hover:border-unt-blue/10 hover:bg-white'
                  }`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BingoGrid;
