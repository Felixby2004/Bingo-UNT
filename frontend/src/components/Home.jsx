import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Home = () => {
  const [galleryImages, setGalleryImages] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [galleryRes, eventsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/gallery`),
          axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/past-events`)
        ]);
        setGalleryImages(galleryRes.data);
        setPastEvents(eventsRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-unt-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-16 pb-16 animate-in fade-in duration-700">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-unt-primary to-unt-night p-8 sm:p-16 text-center text-unt-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-unt-accent/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
        <div className="relative z-10">
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight mb-4">Promo XXVIII</h1>
          <p className="text-xl sm:text-2xl text-unt-accent font-bold mb-8">Ingeniería de Sistemas - UNT</p>
          <p className="text-base sm:text-lg text-unt-white/80 max-w-3xl mx-auto leading-relaxed">
            Bienvenidos a la plataforma oficial de la promoción 28. Aquí encontrarás todos nuestros eventos,
            actividades y la experiencia única del bingo virtual que nos une como promoción.
          </p>
        </div>
      </section>

      {/* Description Section */}
      <section className="bg-unt-white rounded-[3rem] p-8 sm:p-12 shadow-xl border-4 border-unt-light">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-unt-accent/20 rounded-2xl flex items-center justify-center">
            <span className="text-2xl">🎉</span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-unt-primary uppercase tracking-tight">Nuestra Promoción</h2>
            <p className="text-gray-500 font-semibold uppercase tracking-widest text-xs">Objetivos y Valores</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8 text-gray-700">
          <p className="text-lg leading-relaxed">
            La promoción XXVIII de Ingeniería de Sistemas de la Universidad Nacional de Trujillo es una
            comunidad unida por la pasión por la tecnología y el compañerismo. Nuestro objetivo es
            fomentar la integración, el aprendizaje y la diversión entre todos los estudiantes.
          </p>
          <p className="text-lg leading-relaxed">
            Organizamos eventos variados a lo largo del año, desde torneos deportivos hasta noches
            culturales y nuestro famoso bingo virtual, donde la diversión y los premios están garantizados.
          </p>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-unt-primary/10 rounded-2xl flex items-center justify-center">
            <span className="text-2xl">📸</span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-unt-primary uppercase tracking-tight">Galería de Eventos</h2>
            <p className="text-gray-500 font-semibold uppercase tracking-widest text-xs">Momentos Inolvidables</p>
          </div>
        </div>
        {galleryImages.length === 0 ? (
          <div className="bg-gray-100 rounded-[3rem] p-12 text-center">
            <p className="text-gray-500 font-bold">Próximamente habrá fotos aquí!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((img) => (
              <div
                key={img.id}
                className="aspect-[4/3] rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 border-4 border-unt-white"
              >
                <img
                  src={img.image_url}
                  alt={img.caption || 'Galería'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past Events Section */}
      <section className="space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center">
            <span className="text-2xl">📅</span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-unt-primary uppercase tracking-tight">Eventos Pasados</h2>
            <p className="text-gray-500 font-semibold uppercase tracking-widest text-xs">Nuestra Historia</p>
          </div>
        </div>
        {pastEvents.length === 0 ? (
          <div className="bg-gray-100 rounded-[3rem] p-12 text-center">
            <p className="text-gray-500 font-bold">Próximamente habrá eventos aquí!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {pastEvents.map((event) => (
              <div
                key={event.id}
                className="bg-unt-white rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-4 border-unt-light"
              >
                {event.image_url && (
                  <div className="aspect-video">
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-black text-unt-primary uppercase tracking-tight">{event.title}</h3>
                    <span className="text-xs font-bold text-gray-500 bg-unt-light px-3 py-1 rounded-full">{event.date}</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;