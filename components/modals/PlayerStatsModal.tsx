import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Zap, Flame, Star, User, Users } from 'lucide-react';
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
    const teamPower = player.teamScore || 0;
    const teamMembers = player.teamMembers || [];

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
                        </div>

                        {/* Consolidated Stats Block */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl overflow-hidden divide-y divide-slate-700/50">
                            
                            {/* Neynar */}
                            <div className="p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-3 text-sky-400">
                                    <div className="p-2 rounded-full bg-sky-500/10">
                                        <Zap size={20} className="fill-sky-400/20" />
                                    </div>
                                    <span className="font-bold text-base">Neynar</span>
                                </div>
                                <span className="text-lg font-black text-white">+{neynarPower}</span>
                            </div>

                            {/* Streak */}
                            <div className="p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-3 text-orange-400">
                                    <div className="p-2 rounded-full bg-orange-500/10">
                                        <Flame size={20} className="fill-orange-400/20" />
                                    </div>
                                    <span className="font-bold text-base">Streak</span>
                                </div>
                                <span className="text-lg font-black text-white">+{streakPower}</span>
                            </div>

                            {/* Team */}
                            <div className="p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-3 text-indigo-400">
                                    <div className="p-2 rounded-full bg-indigo-500/10">
                                        <Users size={20} className="fill-indigo-400/20" />
                                    </div>
                                    <span className="font-bold text-base">Team</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {teamMembers && teamMembers.length > 0 && (
                                        <div className="flex -space-x-2">
                                            {teamMembers.map((url, i) => (
                                                <div key={i} className="w-6 h-6 rounded-full border border-slate-800 overflow-hidden bg-slate-700">
                                                    {url ? (
                                                        <img src={url} alt="Team" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <User size={12} className="text-slate-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <span className="text-lg font-black text-white">+{teamPower}</span>
                                </div>
                            </div>

                            {/* Bonus */}
                            <div className="p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-3 text-yellow-400">
                                    <div className="p-2 rounded-full bg-yellow-500/10">
                                        <Star size={20} className="fill-yellow-400/20" />
                                    </div>
                                    <span className="font-bold text-base">Bonus</span>
                                </div>
                                <span className="text-lg font-black text-white">+0</span>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PlayerStatsModal;