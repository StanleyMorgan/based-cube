
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const Particle = () => {
  const { angle, distance, duration, delay, size } = useMemo(() => ({
    angle: Math.random() * Math.PI * 2,
    distance: 140 + Math.random() * 60,
    duration: 1.2 + Math.random() * 1.8,
    delay: Math.random() * 3,
    size: 1.5 + Math.random() * 2.5
  }), []);

  const startX = Math.cos(angle) * distance;
  const startY = Math.sin(angle) * distance;

  return (
    <motion.div
      initial={{ x: startX, y: startY, opacity: 0, scale: 0 }}
      animate={{ 
        x: 0, 
        y: 0, 
        opacity: [0, 0.8, 0.8, 0], 
        scale: [0.5, 1, 1, 0.2] 
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "circIn"
      }}
      className="absolute bg-sky-400/60 rounded-full blur-[1px]"
      style={{ 
        width: size, 
        height: size, 
        left: '50%', 
        top: '50%',
        marginLeft: -size/2,
        marginTop: -size/2
      }}
    />
  );
};

const AttractionParticles: React.FC = () => {
  const particles = useMemo(() => Array.from({ length: 25 }), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((_, i) => (
        <Particle key={i} />
      ))}
    </div>
  );
};

export default AttractionParticles;
