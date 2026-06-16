import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, ChevronRight, GalleryHorizontal } from 'lucide-react';
import axios from 'axios';

const Home = () => {
  const [gallery, setGallery] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [galleryRes, eventsRes] = await Promise.all([
          axios.get(`${apiUrl}/api/gallery`),
          axios.get(`${apiUrl}/api/past-events`)
        ]);
        setGallery(galleryRes.data);
        setPastEvents(eventsRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-unt-blue to-night-blue text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
              Promoción 28
            </h1>
            <p className="text-xl md:text-2xl font-bold text-unt-yellow">
              Universidad Nacional del Altiplano
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a href="/bingo" className="bg-unt-yellow text-unt-blue px-8 py-4 rounded-xl font-black text-lg uppercase hover:scale-105 transition-transform shadow-lg">
                Ver Bingo
              </a>
              <button className="border-2 border-unt-yellow text-unt-yellow px-8 py-4 rounded-xl font-black text-lg uppercase hover:bg-unt-yellow hover:text-unt-blue transition-all">
                Conocer Más
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-unt-blue uppercase">
              ¿Qué es Promoción 28?
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Bienvenido a la página oficial de la Promoción 28 de la Universidad Nacional del Altiplano.
              Aquí encontrarás información sobre nuestros eventos, actividades y el famoso Bingo de Sistemas.
              ¡Explora y forma parte de nuestra historia!
            </p>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-unt-blue uppercase flex items-center justify-center gap-3">
              <GalleryHorizontal size={32} />
              Galería de Fotos
            </h2>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-unt-blue mx-auto mb-4"></div>
              <p className="text-gray-500 font-bold uppercase tracking-widest">Cargando galería...</p>
            </div>
          ) : gallery.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[2rem] border-4 border-dashed border-gray-100">
              <GalleryHorizontal size={64} className="mx-auto mb-6 text-gray-200" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xl">Pronto tendremos más fotos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map((item) => (
                <div key={item.id} className="aspect-square overflow-hidden rounded-xl shadow-lg hover:scale-105 transition-transform">
                  <img src={item.image_url} alt={item.caption} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Past Events Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-unt-blue uppercase flex items-center justify-center gap-3">
              <Calendar size={32} />
              Eventos Pasados
            </h2>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-unt-blue mx-auto mb-4"></div>
              <p className="text-gray-500 font-bold uppercase tracking-widest">Cargando eventos...</p>
            </div>
          ) : pastEvents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-[2rem] border-4 border-dashed border-gray-100">
              <Calendar size={64} className="mx-auto mb-6 text-gray-200" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xl">Pronto tendremos más eventos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.map((event) => (
                <div key={event.id} className="bg-white rounded-[2rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all border-2 border-gray-100">
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    {event.image_url ? (
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Calendar size={48} />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-black text-unt-blue uppercase mb-2">{event.title}</h3>
                    <p className="text-gray-500 font-bold uppercase text-sm mb-3">{event.date}</p>
                    {event.description && <p className="text-gray-600 text-sm">{event.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
