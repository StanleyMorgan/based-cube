
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const Particle = () => {
  const { angle, distance, duration, delay, size, color } = useMemo(() => {
    const colors = ['#f0f9ff', '#bae6fd', '#7dd3fc', '#38bdf8']; // От белого к ярко-голубому
    return {
      angle: Math.random() * Math.PI * 2,
      distance: 150 + Math.random() * 80,
      duration: 0.8 + Math.random() * 1.2, // Быстрее притяжение
      delay: Math.random() * 4,
      size: 2 + Math.random() * 3, // Чуть больше размер
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  }, []);

  const startX = Math.cos(angle) * distance;
  const startY = Math.sin(angle) * distance;

  return (
    <motion.div
      initial={{ x: startX, y: startY, opacity: 0, scale: 0 }}
      animate={{ 
        x: 0, 
        y: 0, 
        opacity: [0, 1, 1, 0], 
        scale: [0.3, 1.2, 0.8, 0] 
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "circIn"
      }}
      className="absolute rounded-full"
      style={{ 
        width: size, 
        height: size, 
        left: '50%', 
        top: '50%',
        marginLeft: -size/2,
        marginTop: -size/2,
        backgroundColor: color,
        boxShadow: `0 0 10px 2px ${color}`, // Мощное свечение
      }}
    />
  );
};

const AttractionParticles: React.FC = () => {
  // Увеличиваем количество частиц для плотности эффекта
  const particles = useMemo(() => Array.from({ length: 45 }), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((_, i) => (
        <Particle key={i} />
      ))}
    </div>
  );
};

export default AttractionParticles;
