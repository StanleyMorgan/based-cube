import React, { useEffect, useState } from 'react';
import { UserState } from '../types';
import { getTimeUntilNextClick } from '../services/storage';
import { Trophy, Zap, Flame } from 'lucide-react';

interface StatsProps {
  userState: UserState;
  canClick: boolean;
  rank: number;
  clickPower: number;
}

const Stats: React.FC<StatsProps> = ({ userState, canClick, rank, clickPower }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (canClick) return;

    const updateTimer = () => {
      setTimeLeft(getTimeUntilNextClick(userState.lastClickDate));
    };

    const timer = setInterval(updateTimer, 1000);
    
    // Initial call
    updateTimer();

    return () => clearInterval(timer);
  }, [canClick, userState.lastClickDate]);

  const isRestricted = userState.fid && userState.fid > 1600000;

  return (
    <div className="flex flex-col items-center gap-6 mb-8 w-full max-w-xs px-4">
      {/* Main Score */}
      <div className="flex flex-col items-center">
        <span className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Score</span>
        <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400 drop-shadow-lg tracking-tight">
          {userState.score.toLocaleString()}
        </span>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 gap-4 w-full">
        {/* Rank */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-yellow-400 mb-1">
            <Trophy size={14} />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Rank</span>
          </div>
          <span className="text-xl font-bold text-white">#{rank}</span>
        </div>

        {/* Power */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-sky-400 mb-1">
            <Zap size={14} />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Power</span>
          </div>
          <span className="text-xl font-bold text-white">+{clickPower}</span>
        </div>
      </div>

      {/* Timer / Status Row */}
      <div className="flex items-center justify-center gap-3 w-full">
        {/* Status/Timer Pill */}
        {!canClick ? (
            <div className="px-4 py-1.5 bg-slate-900/80 rounded-full border border-slate-800 flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                {isRestricted ? (
                    <span className="text-gray-400 text-xs whitespace-nowrap font-bold">Access Restricted</span>
                ) : (
                    <>
                        <span className="text-gray-400 text-xs whitespace-nowrap">Next in:</span>
                        <span className="font-mono text-sky-300 text-sm">{timeLeft}</span>
                    </>
                )}
            </div>
        ) : (
            <div className="px-4 py-1.5 bg-emerald-900/20 rounded-full border border-emerald-500/30 animate-pulse flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-emerald-300 text-sm font-bold">Ready</span>
            </div>
        )}

        {/* Streak Pill */}
        <div className="px-3 py-1.5 bg-orange-900/10 rounded-full border border-orange-500/20 flex items-center gap-1.5 shadow-lg" title="Daily Streak">
            <Flame size={14} className="text-orange-500 fill-orange-500" />
            <span className="text-orange-300 text-sm font-bold">{userState.streak}</span>
        </div>
      </div>
    </div>
  );
};

export default Stats;