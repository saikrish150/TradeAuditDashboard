import React from 'react';

const Card = ({ children, className = "", onClick, style }) => (
  <div onClick={onClick} style={style} className={`bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-slate-600' : ''} ${className}`}>
    {children}
  </div>
);

export default Card;