import React, { useEffect, useState } from 'react';
import { UserState } from '../types';
import { getTimeUntilNextClick } from '../services/storage';

interface StatsProps {
  userState: UserState;
  canClick: boolean;
}

const Stats: React.FC<StatsProps> = ({ userState, canClick }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (canClick) return;

    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilNextClick());
    }, 1000);
    
    // Initial call
    setTimeLeft(getTimeUntilNextClick());

    return () => clearInterval(timer);
  }, [canClick]);

  return (
    <div className="flex flex-col items-center gap-4 mb-8">
      <div className="flex flex-col items-center">
        <span className="text-gray-400 text-sm uppercase tracking-wider">Your Score</span>
        <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400 drop-shadow-lg">
          {userState.score.toLocaleString()}
        </span>
      </div>

      {!canClick && (
        <div className="px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50 backdrop-blur-md">
          <span className="text-gray-400 text-xs mr-2">Next click:</span>
          <span className="font-mono text-sky-300">{timeLeft}</span>
        </div>
      )}
      
      {canClick && (
         <div className="px-4 py-2 bg-emerald-900/30 rounded-full border border-emerald-500/30 animate-pulse">
            <span className="text-emerald-300 text-sm font-bold">Cube is ready!</span>
         </div>
      )}
    </div>
  );
};

export default Stats;