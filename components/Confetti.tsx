import { motion } from 'framer-motion';

const Confetti = () => {
  // Simple particle explosion effect
  const particles = Array.from({ length: 20 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-yellow-400' : 'bg-sky-400'}`}
          initial={{ 
            x: "50%", 
            y: "50%", 
            opacity: 1, 
            scale: 0 
          }}
          animate={{ 
            x: `${50 + (Math.random() - 0.5) * 150}%`, 
            y: `${50 + (Math.random() - 0.5) * 150}%`, 
            opacity: 0, 
            scale: Math.random() * 1.5 
          }}
          transition={{ 
            duration: 1 + Math.random(), 
            ease: "easeOut" 
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;