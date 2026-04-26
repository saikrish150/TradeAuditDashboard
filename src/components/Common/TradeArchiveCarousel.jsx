import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

const TradeArchiveCarousel = ({ images }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 4000); // Cycle every 4 seconds
    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) return null;

  return (
    <div className="w-full h-48 sm:h-64 bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800">
      <AnimatePresence mode="wait">
        <Motion.img
          key={index}
          src={images[index]}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="w-full h-full object-cover"
          alt={`Trade Chart ${index + 1}`}
          loading="lazy"
        />
      </AnimatePresence>
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none"></div>

      {/* Multi-Image Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-3 right-3 flex gap-1.5 items-center bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
          {images.map((_, i) => (
            <div 
              key={i} 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === index ? 'bg-journal-gold w-4' : 'bg-white/20'}`}
            />
          ))}
        </div>
      )}
      
      {/* Count Badge */}
      {images.length > 1 && (
        <div className="absolute top-3 right-3 bg-journal-gold/90 backdrop-blur-sm text-[10px] font-black px-2 py-0.5 rounded-md border border-journal-gold/50 text-journal-bg uppercase tracking-tighter">
          {images.length} Charts
        </div>
      )}
    </div>
  );
};

export default TradeArchiveCarousel;
