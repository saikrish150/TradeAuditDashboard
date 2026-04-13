import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';

const LightRaysAndParticles = () => {
  const [particles] = useState(() => 
    Array.from({ length: 45 }).map(() => ({
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
      y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
      opacity: Math.random() * 0.7 + 0.2,
      scale: Math.random() * 2 + 0.5,
      destY: Math.random() * -600,
      duration: Math.random() * 20 + 10,
    }))
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Light Rays / Glowing Orbs */}
      <Motion.div
        className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-[#D4AF37]/20 rounded-full blur-[160px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <Motion.div
        className="absolute bottom-[-15%] right-[-10%] w-[70%] h-[70%] bg-[#E63946]/15 rounded-full blur-[180px]"
        animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <Motion.div
        className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-[#2ECC71]/10 rounded-full blur-[140px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Floating Particles */}
      {particles.map((p, i) => (
        <Motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)]"
          initial={{
            x: p.x,
            y: p.y,
            opacity: p.opacity,
            scale: p.scale,
          }}
          animate={{
            y: [null, p.destY],
            opacity: [null, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

export default LightRaysAndParticles;
