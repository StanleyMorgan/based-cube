import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Zap, Flame, Star, User } from 'lucide-react';
import { LeaderboardEntry } from '../../types';

interface PlayerStatsModalProps {
    player: LeaderboardEntry | null;
    onClose: () => void;
}

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ player, onClose }) => {
    if (!player) return null;

    // Calculate power stats based on raw data
    const neynarPower = Math.floor(100 * (player.neynarScore || 0));
    const streakPower = Math.min(player.streak, 30);

    return (
        <AnimatePresence>
            {player && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative z-10"
                    >
                        {/* Player Header */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative mb-3">
                                {player.pfpUrl ? (
                                    <img 
                                        src={player.pfpUrl} 
                                        alt={player.username} 
                                        className="w-20 h-20 rounded-full border-4 border-slate-700 shadow-lg"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center border-4 border-slate-600">
                                        <User size={40} className="text-slate-400" />
                                    </div>
                                )}
                                <div className="absolute -bottom-2 -right-2 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded-full border border-slate-600">
                                    #{player.rank}
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-white">{player.username}</h2>
                            <span className="text-slate-400 text-sm font-mono">{player.score.toLocaleString()} Score</span>
                        </div>

                        <div className="space-y-4">
                            {/* Neynar */}
                            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex justify-between items-center">
                                <div className="flex items-center gap-3 text-sky-400">
                                    <Zap size={22} className="fill-sky-400/20" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-base leading-none">Neynar</span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Base Power</span>
                                    </div>
                                </div>
                                <span className="text-xl font-black text-white">+{neynarPower}</span>
                            </div>

                            {/* Streak */}
                            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex justify-between items-center">
                                <div className="flex items-center gap-3 text-orange-400">
                                    <Flame size={22} className="fill-orange-400/20" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-base leading-none">Streak</span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{player.streak} Days</span>
                                    </div>
                                </div>
                                <span className="text-xl font-black text-white">+{streakPower}</span>
                            </div>

                            {/* Bonus - Placeholder for now */}
                            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex justify-between items-center opacity-50">
                                <div className="flex items-center gap-3 text-yellow-400">
                                    <Star size={22} className="fill-yellow-400/20" />
                                    <span className="font-bold text-base">Bonus</span>
                                </div>
                                <span className="text-xl font-black text-white">+0</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PlayerStatsModal;