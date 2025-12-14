import React from 'react';
import { motion, useAnimation, useSpring } from 'framer-motion';
import { Target, Lock, Trophy, Zap, Star, Hexagon } from 'lucide-react';

interface CubeProps {
  canClick: boolean;
  onClick: () => void;
  theme?: 'default' | 'holiday';
}

// --- HOLIDAY VECTORS ---

const TreeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 opacity-50">
    <path d="M12 2L4 12h5l-3 8h16l-3-8h5L12 2z" />
    <path d="M12 20v2" />
  </svg>
);

const OrnamentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 opacity-50">
    <circle cx="12" cy="14" r="8" />
    <path d="M10 6h4" />
    <path d="M12 2v4" />
    <path d="M12 14a4 4 0 0 1-4-4" />
  </svg>
);

const CandyCaneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 opacity-50">
    <path d="M7 21v-8a5 5 0 0 1 10 0v2" />
    <path d="M7 17h10" />
    <path d="M7 13h10" />
    <path d="M7 9h6" />
  </svg>
);

const HolidayStarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 opacity-50">
    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z" />
    <path d="M12 2v20" className="opacity-30" />
    <path d="M2 12h20" className="opacity-30" />
  </svg>
);

const FrozenLockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-sky-200/50">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    {/* Icicles */}
    <path d="M8 22v2" />
    <path d="M12 22v3" />
    <path d="M16 22v2" />
    {/* Snowflake center */}
    <path d="M12 15v2" strokeWidth="2" />
    <path d="M11 16h2" strokeWidth="2" />
  </svg>
);


const Cube: React.FC<CubeProps> = ({ canClick, onClick, theme = 'default' }) => {
  const controls = useAnimation();
  const isHoliday = theme === 'holiday';

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

  // Dynamic Styles based on Theme
  let borderColor, faceBg, textColor;

  if (isHoliday) {
      // Holiday Colors (Red/Green/Gold vibe)
      if (canClick) {
          borderColor = 'border-rose-400';
          faceBg = 'bg-rose-900/30';
          textColor = 'text-rose-100';
      } else {
          borderColor = 'border-slate-500/50';
          faceBg = 'bg-slate-800/40';
          textColor = 'text-slate-300';
      }
  } else {
      // Default Sci-Fi Colors
      borderColor = canClick ? 'border-sky-400' : 'border-red-500/50';
      faceBg = canClick ? 'bg-sky-900/20' : 'bg-red-900/20';
      textColor = canClick ? 'text-sky-100' : 'text-red-200';
  }

  // Face common styles
  // Added shadow-inset to enhance depth perception
  const faceClass = `absolute w-full h-full border-2 ${borderColor} ${faceBg} ${textColor} backdrop-blur-md flex items-center justify-center select-none transition-all duration-500 cube-face-glow shadow-[0_0_10px_rgba(0,0,0,0.5)_inset]`;

  // The size of the cube in pixels (Tailwind w-24 is 6rem = 96px, sm:w-32 is 8rem = 128px)
  const size = "w-24 h-24 sm:w-32 sm:h-32";
  
  return (
    <div className="relative flex items-center justify-center perspective-1000 py-12">
      <motion.div
        className={`relative ${size} preserve-3d cursor-pointer`}
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
                        {/* Always use Target icon, even for Holiday theme */}
                        <Target size={32} strokeWidth={1.5} className="drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
                        <span className="text-xs font-black tracking-widest">CLICK</span>
                    </div>
                ) : (
                    <div className={`flex flex-col items-center gap-1 ${isHoliday ? 'text-sky-200/50' : 'text-red-300/50'}`}>
                        {isHoliday ? (
                            <FrozenLockIcon />
                        ) : (
                            <Lock size={32} strokeWidth={1.5} />
                        )}
                        <span className="text-xs font-black tracking-widest">24h</span>
                    </div>
                )}
            </div>

            {/* Back */}
            <div className={`${faceClass} [transform:rotateY(180deg)_translateZ(3rem)] sm:[transform:rotateY(180deg)_translateZ(4rem)]`}>
                {isHoliday ? (
                    <TreeIcon />
                ) : (
                    <Hexagon size={40} strokeWidth={0.5} className="opacity-30" />
                )}
            </div>

            {/* Right */}
            <div className={`${faceClass} [transform:rotateY(90deg)_translateZ(3rem)] sm:[transform:rotateY(90deg)_translateZ(4rem)]`}>
                {isHoliday ? (
                    <OrnamentIcon />
                ) : (
                    <Trophy size={35} strokeWidth={0.5} className="opacity-30" />
                )}
            </div>

            {/* Left */}
            <div className={`${faceClass} [transform:rotateY(-90deg)_translateZ(3rem)] sm:[transform:rotateY(-90deg)_translateZ(4rem)]`}>
                {isHoliday ? (
                    <CandyCaneIcon />
                ) : (
                    <Zap size={35} strokeWidth={0.5} className="opacity-30" />
                )}
            </div>

            {/* Top */}
            <div className={`${faceClass} [transform:rotateX(90deg)_translateZ(3rem)] sm:[transform:rotateX(90deg)_translateZ(4rem)]`}>
                {isHoliday ? (
                    <HolidayStarIcon />
                ) : (
                    <Star size={35} strokeWidth={0.5} className="opacity-30" />
                )}
            </div>

            {/* Bottom */}
            <div className={`${faceClass} [transform:rotateX(-90deg)_translateZ(3rem)] sm:[transform:rotateX(-90deg)_translateZ(4rem)]`}>
                {/* Scaled down SVG */}
                <svg width="40" height="40" viewBox="0 0 100 100" className="opacity-20 stroke-current" fill="none" strokeWidth="4">
                    {isHoliday ? (
                        <>
                            {/* Simple Snowflake Pattern */}
                            <path d="M50 10v80 M10 50h80 M22 22l56 56 M78 22L22 78" strokeWidth="3" />
                            <circle cx="50" cy="50" r="10" />
                        </>
                    ) : (
                        <>
                            <circle cx="50" cy="50" r="40" />
                            <circle cx="50" cy="50" r="25" />
                            <line x1="50" y1="10" x2="50" y2="90" />
                            <line x1="10" y1="50" x2="90" y2="50" />
                        </>
                    )}
                </svg>
            </div>
            
            {/* Inner Core for visual effect */}
            <div className={`absolute top-1/2 left-1/2 w-12 h-12 ${
                isHoliday 
                    ? (canClick ? 'bg-rose-500/20' : 'bg-sky-500/10')
                    : (canClick ? 'bg-sky-500/20' : 'bg-red-500/10')
            } -translate-x-1/2 -translate-y-1/2 blur-xl rounded-full pointer-events-none transform-gpu`}></div>

        </motion.div>
      </motion.div>
    </div>
  );
};

export default Cube;