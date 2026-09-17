"use client";

import { useState } from "react";

export default function ImageCarousel({ photos, altText }: { photos: string[], altText: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Si no hi ha fotos, mostrem el placeholder gris
  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200">
        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        <span className="text-gray-500 font-bold uppercase text-sm">Sense fotos</span>
      </div>
    );
  }

  const nextPhoto = () => setCurrentIndex((prev) => (prev + 1) % photos.length);
  const prevPhoto = () => setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));

  return (
    <div className="relative w-full h-full bg-gray-200 group">
      <img
        src={photos[currentIndex]}
        alt={`${altText} - foto ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />
      
      {/* Si hi ha més d'una foto, dibuixem les fletxes */}
      {photos.length > 1 && (
        <>
          <button 
            onClick={prevPhoto}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-yellow-400 hover:text-red-700 transition-colors shadow-lg"
            aria-label="Foto anterior"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          
          <button 
            onClick={nextPhoto}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-yellow-400 hover:text-red-700 transition-colors shadow-lg"
            aria-label="Foto següent"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
          </button>
          
          {/* Indicador de número de foto */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full font-bold shadow">
            {currentIndex + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}