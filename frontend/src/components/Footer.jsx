import React from 'react';
import { Instagram, Music2 } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-unt-blue text-unt-white mt-12 sm:mt-20 border-t border-white/5 pt-8 sm:pt-10 pb-8 sm:pb-10 text-center">
      <div className="flex flex-col items-center space-y-4 sm:space-y-6 px-4">
        <div className="flex space-x-4 sm:space-x-6">
          <a href="https://www.instagram.com/sistemas28_unt?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noreferrer" className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl shadow-lg flex items-center justify-center text-pink-500 hover:scale-110 transition-transform">
            <Instagram size={20} sm:size={24} />
          </a>
        </div>
        <div className="space-y-1">
          <p className="font-bold text-xs sm:text-sm uppercase tracking-wider sm:tracking-widest">Promo XXVIII - Ingeniería de Sistemas</p>
          <p className="font-medium text-[8px] sm:text-[10px] uppercase text-white/60">Universidad Nacional de Trujillo</p>
        </div>
        <p className="text-[7px] sm:text-[8px] font-medium uppercase tracking-widest text-white/40">© 2026 Bingo UNT - Desarrollado por Felix A. Chávez V.</p>
      </div>
    </footer>
  );
};

export default Footer;
