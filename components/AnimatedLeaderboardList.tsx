import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, User } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface AnimatedLeaderboardListProps {
    snippet: LeaderboardEntry[];
    oldRank: number;
    newRank: number;
}

const AnimatedLeaderboardList: React.FC<AnimatedLeaderboardListProps> = ({ snippet, oldRank, newRank }) => {
    const isRankUp = newRank < oldRank;

    return (
        <div className="space-y-1.5 pt-3 border-t border-slate-700/50 relative">
            {snippet.map((entry) => {
                let initialY = 0;
                let initialOpacity = 1;
                let zIndex = 0;

                // Animation Logic for Rank Up
                if (isRankUp) {
                    if (entry.isCurrentUser) {
                        // User moves UP into position (starts lower)
                        initialY = 48; // Approximate height of a row + gap
                        zIndex = 10;
                    } else if (entry.rank === newRank + 1) {
                        // The person immediately below us (who we overtook) moves DOWN into position (starts higher)
                        initialY = -48;
                    } else if (entry.rank < newRank) {
                        // People above us fade in / slide down slightly to reveal
                        initialY = -20;
                        initialOpacity = 0;
                    }
                }

                return (
                    <motion.div
                        key={entry.id}
                        initial={{ y: initialY, opacity: initialOpacity }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 60, 
                            damping: 15, 
                            delay: 0.2 // Small delay to let modal open first
                        }}
                        style={{ zIndex }}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm relative ${
                            entry.isCurrentUser 
                                ? 'bg-sky-500/20 border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]' 
                                : 'bg-slate-700/20 border border-transparent opacity-80'
                        }`}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`font-mono font-bold w-6 text-center ${entry.isCurrentUser ? 'text-sky-300' : 'text-slate-500'}`}>
                                #{entry.rank}
                            </span>
                            {entry.pfpUrl ? (
                                <img src={entry.pfpUrl} alt="" className="w-5 h-5 rounded-full" />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center">
                                    <User size={12} className="text-slate-400" />
                                </div>
                            )}
                            <span className={`truncate max-w-[80px] ${entry.isCurrentUser ? 'font-bold text-white' : 'text-slate-300'}`}>
                                {entry.username}
                            </span>
                        </div>
                        <span className="font-mono text-xs text-slate-400">
                            {entry.score.toLocaleString()}
                        </span>
                        
                        {/* Visual indicator for the user being animated */}
                        {entry.isCurrentUser && isRankUp && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 }}
                                className="absolute -right-1 -top-1 w-3 h-3 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg"
                            >
                                <ArrowUp size={8} className="text-black stroke-[3px]" />
                            </motion.div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
};

export default AnimatedLeaderboardList;