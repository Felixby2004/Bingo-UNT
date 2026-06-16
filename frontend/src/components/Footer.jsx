import React from 'react';
import { Instagram, Music2 } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-unt-blue text-white py-12 px-4 mt-8">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Columna 1: Logo y nombre */}
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-unt-yellow uppercase">
              Promoción 28
            </h3>
            <p className="text-white/60">
              Universidad Nacional del Trujillo
            </p>
          </div>

          {/* Columna 2: Redes sociales */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-unt-yellow uppercase">
              Síguenos
            </h4>
            <div className="flex space-x-4">
              <a 
                href="https://www.instagram.com/sistemas28_unt?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white/10 p-3 rounded-xl hover:bg-unt-yellow hover:text-unt-blue transition-all"
              >
                <Instagram size={24} />
              </a>
              <a 
                href="https://kick.com/felix-04p" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white/10 p-3 rounded-xl hover:bg-unt-yellow hover:text-unt-blue transition-all"
              >
                <Music2 size={24} />
              </a>
            </div>
          </div>

          {/* Columna 3: Derechos reservados */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-unt-yellow uppercase">
              Contacto
            </h4>
            <p className="text-white/60">
              © 2026 Promoción 28 - UNT - Ing. Sistemas Promo XXVIII. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
