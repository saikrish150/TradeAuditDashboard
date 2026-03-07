import React from 'react';
import { motion } from 'framer-motion';
const Card = ({ children, className = "", onClick, style }) => (
  <motion.div
    onClick={onClick}
    style={style}
    whileHover={{ y: -8, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className={`glass-panel rounded-3xl overflow-hidden transition-colors duration-300 relative group ${onClick ? 'cursor-pointer hover:border-indigo-500/50 hover:shadow-indigo-500/20' : ''} ${className}`}
  >
    {/* Subtle Inner Glow Layer */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

    <div className="relative z-10 w-full h-full">
      {children}
    </div>
  </motion.div>
);

export default Card;