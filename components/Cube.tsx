import React from 'react';
import { motion, useAnimation, useSpring } from 'framer-motion';
import { Target, Lock, Trophy, Zap, Star, Hexagon } from 'lucide-react';

interface CubeProps {
  canClick: boolean;
  onClick: () => void;
}

const Cube: React.FC<CubeProps> = ({ canClick, onClick }) => {
  const controls = useAnimation();

  const handleClick = () => {
    if (!canClick) {
        // Shake animation if disabled
        controls.start({
            x: [0, -10, 10, -10, 10, 0],
            transition: { duration: 0.4 }
        });
        return;
    }
    onClick();
  };

  const borderColor = canClick ? 'border-sky-400' : 'border-red-500/50';
  const faceBg = canClick ? 'bg-sky-900/20' : 'bg-red-900/20';
  const textColor = canClick ? 'text-sky-100' : 'text-red-200';

  // Face common styles
  // Added shadow-inset to enhance depth perception
  const faceClass = `absolute w-full h-full border-2 ${borderColor} ${faceBg} ${textColor} backdrop-blur-md flex items-center justify-center select-none transition-all duration-500 cube-face-glow shadow-[0_0_20px_rgba(0,0,0,0.5)_inset]`;

  // The size of the cube in pixels (Tailwind w-48 is 12rem = 192px, sm:w-64 is 16rem = 256px)
  const size = "w-48 h-48 sm:w-64 sm:h-64";
  
  // Transform values for base (6rem) and sm (8rem)
  // We use explicit tailwind arbitrary values for each breakpoint to ensure valid CSS generation
  const baseZ = "6rem";
  const smZ = "8rem";

  return (
    <div className="relative flex items-center justify-center perspective-1000 py-12">
      <motion.div
        className={`relative ${size} preserve-3d cursor-pointer`}
        onClick={handleClick}
        animate={controls}
        style={{
           rotateX: useSpring(20, { stiffness: 100, damping: 30 }),
           rotateY: useSpring(45, { stiffness: 100, damping: 30 }),
        }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div 
            className={`w-full h-full preserve-3d`}
            animate={{ 
                rotateY: 360, 
                rotateX: 360 
            }}
            transition={{ 
                repeat: Infinity, 
                duration: canClick ? 20 : 60, // Faster rotation when active
                ease: "linear" 
            }}
        >
            {/* Front */}
            <div className={`${faceClass} [transform:translateZ(${baseZ})] sm:[transform:translateZ(${smZ})]`}>
                {canClick ? (
                    <div className="flex flex-col items-center gap-2">
                        <Target size={64} strokeWidth={1.5} className="drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
                        <span className="text-xl font-black tracking-widest">CLICK</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-red-300/50">
                        <Lock size={64} strokeWidth={1.5} />
                        <span className="text-xl font-black tracking-widest">24h</span>
                    </div>
                )}
            </div>

            {/* Back */}
            <div className={`${faceClass} [transform:rotateY(180deg)_translateZ(${baseZ})] sm:[transform:rotateY(180deg)_translateZ(${smZ})]`}>
                <Hexagon size={80} strokeWidth={0.5} className="opacity-30" />
            </div>

            {/* Right */}
            <div className={`${faceClass} [transform:rotateY(90deg)_translateZ(${baseZ})] sm:[transform:rotateY(90deg)_translateZ(${smZ})]`}>
                <Trophy size={70} strokeWidth={0.5} className="opacity-30" />
            </div>

            {/* Left */}
            <div className={`${faceClass} [transform:rotateY(-90deg)_translateZ(${baseZ})] sm:[transform:rotateY(-90deg)_translateZ(${smZ})]`}>
                <Zap size={70} strokeWidth={0.5} className="opacity-30" />
            </div>

            {/* Top */}
            <div className={`${faceClass} [transform:rotateX(90deg)_translateZ(${baseZ})] sm:[transform:rotateX(90deg)_translateZ(${smZ})]`}>
                <Star size={70} strokeWidth={0.5} className="opacity-30" />
            </div>

            {/* Bottom */}
            <div className={`${faceClass} [transform:rotateX(-90deg)_translateZ(${baseZ})] sm:[transform:rotateX(-90deg)_translateZ(${smZ})]`}>
                {/* Example of inline SVG for custom graphics */}
                <svg width="80" height="80" viewBox="0 0 100 100" className="opacity-20 stroke-current" fill="none" strokeWidth="2">
                    <circle cx="50" cy="50" r="40" />
                    <circle cx="50" cy="50" r="25" />
                    <line x1="50" y1="10" x2="50" y2="90" />
                    <line x1="10" y1="50" x2="90" y2="50" />
                </svg>
            </div>
            
            {/* Inner Core for visual effect */}
            <div className={`absolute top-1/2 left-1/2 w-24 h-24 ${canClick ? 'bg-sky-500/20' : 'bg-red-500/10'} -translate-x-1/2 -translate-y-1/2 blur-2xl rounded-full pointer-events-none transform-gpu`}></div>

        </motion.div>
      </motion.div>
    </div>
  );
};

export default Cube;