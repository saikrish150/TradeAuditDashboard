import React from 'react';
import { motion as Motion } from 'framer-motion';
const Card = ({ children, className = "", onClick, style }) => (
  <Motion.div
    onClick={onClick}
    style={style}
    whileHover={{ y: -4, scale: 1.015 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
    className={`modern-glass rounded-[32px] overflow-hidden transition-all duration-300 relative group ${onClick ? 'cursor-pointer hover:border-journal-gold/40 hover:gold-glow' : 'hover:border-journal-gold/20'} ${className}`}
  >
    {/* Soft inner gold highlight */}
    <div className="absolute inset-0 bg-gradient-to-br from-journal-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

    <div className="relative z-10 w-full h-full">
      {children}
    </div>
  </Motion.div>
);

export default Card;