"use client";

import { useState, useEffect, useCallback } from "react";

export type GalleryItem = {
  id: number;
  title: string | null;
  caption: string | null;
  image_url: string;
  category: string | null;
  season: number | null;
  created_at: string;
};

export default function GalleryViewer({ items }: { items: GalleryItem[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Categories úniques
  const categories = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean) as string[])
  );

  const filteredItems =
    selectedCategory === "all"
      ? items
      : items.filter((i) => i.category === selectedCategory);

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const showNext = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev! + 1) % filteredItems.length);
  }, [selectedIndex, filteredItems.length]);

  const showPrev = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev! - 1 + filteredItems.length) % filteredItems.length);
  }, [selectedIndex, filteredItems.length]);

  // Gestió de tecles (ESC, fletxes)
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, showNext, showPrev]);

  // Prevenir scroll de la pàgina quan el lightbox està obert
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedIndex]);

  const currentItem = selectedIndex !== null ? filteredItems[selectedIndex] : null;

  return (
    <div>
      {/* Filtres per categoria */}
      {categories.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-4 py-2 text-xs font-black uppercase transition ${
              selectedCategory === "all"
                ? "bg-gray-950 text-yellow-400 shadow"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Totes ({items.length})
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase transition ${
                  selectedCategory === cat
                    ? "bg-gray-950 text-yellow-400 shadow"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Llistat d'imatges */}
      {filteredItems.length ? (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((g, index) => (
            <figure
              key={g.id}
              onClick={() => openLightbox(index)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gray-100 shadow-sm border border-gray-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-900">
                <img
                  src={g.image_url}
                  alt={g.title || "VelociCAT Racing Team"}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                  <span className="rounded-full bg-white/90 p-3 text-gray-950 shadow-lg backdrop-blur-sm">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                  </span>
                </div>
                {g.category && (
                  <span className="absolute top-3 left-3 rounded bg-red-600 px-2 py-0.5 text-xs font-black uppercase text-white shadow">
                    {g.category}
                  </span>
                )}
                {g.season && (
                  <span className="absolute top-3 right-3 rounded bg-gray-950/80 px-2 py-0.5 text-xs font-bold text-yellow-400 backdrop-blur-sm">
                    {g.season}
                  </span>
                )}
              </div>

              {(g.title || g.caption) && (
                <figcaption className="p-4 bg-white">
                  {g.title && <b className="block text-gray-900 font-black text-base">{g.title}</b>}
                  {g.caption && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{g.caption}</p>}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center font-bold text-gray-500">
          No s'han trobat fotografies en aquesta categoria.
        </div>
      )}

      {/* Lightbox Modal */}
      {currentItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md transition-opacity"
          onClick={closeLightbox}
        >
          {/* Botó Tancar */}
          <button
            onClick={closeLightbox}
            aria-label="Tancar"
            className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 hover:scale-105"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Botó Anterior */}
          {filteredItems.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                showPrev();
              }}
              aria-label="Anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/25 hover:scale-105"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Imatge + Peça de contingut central */}
          <div
            className="relative flex flex-col items-center max-w-5xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentItem.image_url}
              alt={currentItem.title || "Fotografia VelociCAT"}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />

            {/* Metadades de la imatge */}
            <div className="mt-4 w-full flex flex-wrap items-center justify-between gap-4 px-2 text-white">
              <div>
                <div className="flex items-center gap-2">
                  {currentItem.category && (
                    <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-black uppercase">
                      {currentItem.category}
                    </span>
                  )}
                  {currentItem.season && (
                    <span className="text-xs font-bold text-yellow-400">
                      Temporada {currentItem.season}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-lg font-black">{currentItem.title || "VelociCAT Racing Team"}</h3>
                {currentItem.caption && <p className="text-sm text-gray-300 mt-0.5">{currentItem.caption}</p>}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400">
                  {selectedIndex! + 1} de {filteredItems.length}
                </span>
                <a
                  href={currentItem.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
                >
                  Obrir original ↗
                </a>
              </div>
            </div>
          </div>

          {/* Botó Següent */}
          {filteredItems.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                showNext();
              }}
              aria-label="Següent"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/25 hover:scale-105"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
