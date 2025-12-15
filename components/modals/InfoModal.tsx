import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Zap, Flame, Star, Users } from 'lucide-react';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    neynarPower: number;
    streakPower: number;
    teamPower?: number;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, neynarPower, streakPower, teamPower = 0 }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Power Breakdown</h2>
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
                                <span className="text-lg font-black text-white">+{teamPower}</span>
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

export default InfoModal;