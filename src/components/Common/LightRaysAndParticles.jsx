import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';

const LightRaysAndParticles = () => {
  const [particles] = useState(() => 
    Array.from({ length: 25 }).map(() => ({
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
      y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
      opacity: Math.random() * 0.5 + 0.1,
      scale: Math.random() * 1.5 + 0.5,
      destY: Math.random() * -500,
      duration: Math.random() * 15 + 10,
    }))
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Light Rays / Glowing Orbs */}
      <Motion.div
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00f2fe]/10 rounded-full blur-[120px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <Motion.div
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#4facfe]/10 rounded-full blur-[150px]"
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <Motion.div
        className="absolute top-[40%] left-[20%] w-[30%] h-[30%] bg-[#e100ff]/5 rounded-full blur-[100px]"
        animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
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
