import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, MapPin, Calendar, ExternalLink, Github, Award, Layers } from "lucide-react";
import { GalleryItem } from "./types";

interface ProjectModalProps {
  item: GalleryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  totalItems: number;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  item,
  isOpen,
  onClose,
  onPrev,
  onNext,
  currentIndex,
  totalItems,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  if (!isOpen || !item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-white/80 hover:text-white bg-black/50 hover:bg-black/80 rounded-full border border-white/10 backdrop-blur-md transition-all duration-150 hover:scale-110 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Canvas Area with Next/Prev Arrows */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-black overflow-hidden flex items-center justify-center group select-none">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="eager"
          />

          {/* Navigation Overlay Arrows */}
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous item"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-black/60 hover:bg-black/90 text-white rounded-full border border-white/20 backdrop-blur-md transition-all duration-150 hover:scale-110 active:scale-90"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Next item"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-black/60 hover:bg-black/90 text-white rounded-full border border-white/20 backdrop-blur-md transition-all duration-150 hover:scale-110 active:scale-90"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* GPS Map Camera Style Overlay Badge (Matching User's Photo) */}
          <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 pointer-events-none">
            <div className="bg-black/75 backdrop-blur-md text-white border border-white/15 px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-3 max-w-md pointer-events-auto">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                  {item.location || "Haridwar, Uttarakhand, India 🇮🇳"}
                </div>
                <div className="text-slate-300 text-[11px] leading-tight mt-0.5">
                  {item.metadata?.gpsCoords ? String(item.metadata.gpsCoords) : "Haridwar Dehradun Road, Haripur Kalan, Haridwar"}
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5 flex items-center gap-2">
                  <span>{item.date || "Sunday, 13/09/2026"}</span>
                  {Boolean(item.metadata?.camera) && (
                    <span className="text-amber-400 font-mono">📷 {String(item.metadata?.camera)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Counter pill (e.g. "4 / 12") */}
            <div className="bg-black/75 backdrop-blur-md border border-white/15 px-4 py-1.5 rounded-full text-xs font-mono font-bold text-white shadow-lg pointer-events-auto">
              {currentIndex + 1} / {totalItems}
            </div>
          </div>
        </div>

        {/* Project Details Footer */}
        <div className="p-5 sm:p-6 bg-slate-900 overflow-y-auto space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                {item.category && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    {item.category}
                  </span>
                )}
                {item.badge && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {item.badge}
                  </span>
                )}
              </div>
              <h2 id="modal-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {item.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {item.github && (
                <a
                  href={item.github}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Github className="w-3.5 h-3.5" />
                  Source
                </a>
              )}
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md hover:shadow-amber-500/20 transition-all flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Live Preview
                </a>
              )}
            </div>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed">
            {item.description}
          </p>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-800/80 text-slate-300 border border-slate-700/60"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Metrics Row */}
          {item.metrics && item.metrics.length > 0 && (
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              {item.metrics.map((metric) => (
                <div key={metric.label} className="bg-slate-800/40 rounded-xl p-3 border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">{metric.label}</div>
                  <div className="text-base sm:text-lg font-bold text-amber-400 mt-0.5">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
