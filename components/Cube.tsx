
import React, { useState } from 'react';
import { motion, useAnimation, useSpring } from 'framer-motion';
import { FrontActiveIcon } from './icons/FrontActiveIcon';
import { FrontInactiveIcon } from './icons/FrontInactiveIcon';
import { BackIcon } from './icons/BackIcon';
import { RightIcon } from './icons/RightIcon';
import { LeftIcon } from './icons/LeftIcon';
import { TopIcon } from './icons/TopIcon';
import { BottomIcon } from './icons/BottomIcon';
import AttractionParticles from './AttractionParticles';
import { Sparkles } from 'lucide-react';

interface CubeProps {
  canClick: boolean;
  onClick: () => void;
}

const Cube: React.FC<CubeProps> = ({ canClick, onClick }) => {
  const [showParticles, setShowParticles] = useState(true);
  const controls = useAnimation();

  const handleClick = () => {
    if (!canClick) {
        // Shake animation if disabled
        controls.start({
            x: [0, -5, 5, -5, 5, 0], // Reduced shake distance for smaller cube
            transition: { duration: 0.4 }
        });
        return;
    }
    onClick();
  };

  // Sci-Fi Colors
  const borderColor = canClick ? 'border-sky-400' : 'border-red-500/50';
  const faceBg = canClick ? 'bg-sky-900/20' : 'bg-red-900/20';
  const textColor = canClick ? 'text-sky-100' : 'text-red-200';

  // Face common styles
  // Added shadow-inset to enhance depth perception
  const faceClass = `absolute w-full h-full border-2 ${borderColor} ${faceBg} ${textColor} backdrop-blur-md flex items-center justify-center select-none transition-all duration-500 cube-face-glow shadow-[0_0_10px_rgba(0,0,0,0.5)_inset]`;

  // The size of the cube in pixels (Tailwind w-24 is 6rem = 96px, sm:w-32 is 8rem = 128px)
  const size = "w-24 h-24 sm:w-32 sm:h-32";
  
  return (
    <div className="relative flex items-center justify-center py-12">
      {/* Particle Toggle Button */}
      <button 
        onClick={() => setShowParticles(!showParticles)}
        className={`absolute -top-4 right-0 z-30 p-2 rounded-full border transition-all duration-300 ${
          showParticles 
            ? 'bg-sky-500/20 border-sky-400 text-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.3)]' 
            : 'bg-slate-800/40 border-slate-700 text-slate-500'
        }`}
      >
        <Sparkles size={16} className={showParticles ? 'animate-pulse' : ''} />
      </button>

      <div className="relative perspective-1000 flex items-center justify-center">
        {/* Particle Effect Layer */}
        {showParticles && <AttractionParticles />}

        <motion.div
          className={`relative ${size} preserve-3d cursor-pointer z-10`}
          onClick={handleClick}
          animate={controls}
          style={{
             rotateX: useSpring(20, { stiffness: 100, damping: 30 }),
             rotateY: useSpring(45, { stiffness: 100, damping: 30 }),
             transformStyle: 'preserve-3d'
          }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div 
              className={`w-full h-full preserve-3d`}
              style={{ transformStyle: 'preserve-3d' }}
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
              <div className={`${faceClass} [transform:translateZ(3rem)] sm:[transform:translateZ(4rem)]`}>
                  {canClick ? (
                      <div className="flex flex-col items-center gap-1">
                          <FrontActiveIcon />
                          <span className="text-xs font-black tracking-widest">CLICK</span>
                      </div>
                  ) : (
                      <div className={`flex flex-col items-center gap-1 text-red-300/50`}>
                          <FrontInactiveIcon />
                          <span className="text-xs font-black tracking-widest">24h</span>
                      </div>
                  )}
              </div>

              {/* Back */}
              <div className={`${faceClass} [transform:rotateY(180deg)_translateZ(3rem)] sm:[transform:rotateY(180deg)_translateZ(4rem)]`}>
                  <BackIcon />
              </div>

              {/* Right */}
              <div className={`${faceClass} [transform:rotateY(90deg)_translateZ(3rem)] sm:[transform:rotateY(90deg)_translateZ(4rem)]`}>
                  <RightIcon />
              </div>

              {/* Left */}
              <div className={`${faceClass} [transform:rotateY(-90deg)_translateZ(3rem)] sm:[transform:rotateY(-90deg)_translateZ(4rem)]`}>
                  <LeftIcon />
              </div>

              {/* Top */}
              <div className={`${faceClass} [transform:rotateX(90deg)_translateZ(3rem)] sm:[transform:rotateX(90deg)_translateZ(4rem)]`}>
                  <TopIcon />
              </div>

              {/* Bottom */}
              <div className={`${faceClass} [transform:rotateX(-90deg)_translateZ(3rem)] sm:[transform:rotateX(-90deg)_translateZ(4rem)]`}>
                  <BottomIcon />
              </div>
              
              {/* Inner Core for visual effect */}
              <div className={`absolute top-1/2 left-1/2 w-12 h-12 ${canClick ? 'bg-sky-500/20' : 'bg-red-500/10'} -translate-x-1/2 -translate-y-1/2 blur-xl rounded-full pointer-events-none transform-gpu`}></div>

          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Cube;
