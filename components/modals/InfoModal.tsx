import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Zap, Flame, Star, Users, User, ArrowUp, ArrowDown } from 'lucide-react';
import { TeamMember } from '../../types';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    neynarPower: number;
    neynarPowerChange?: number;
    streakPower: number;
    teamPower?: number;
    teamMembers?: TeamMember[];
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, neynarPower, neynarPowerChange = 0, streakPower, teamPower = 0, teamMembers = [] }) => {
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
                            <h2 className="text-2xl font-bold text-white">Power</h2>
                        </div>

                        {/* Consolidated Stats Block */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl overflow-hidden divide-y divide-slate-700/50">
                            
                            {/* Neynar */}
                            <div className="p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-3 text-sky-400">
                                    <div className="p-2 rounded-full bg-sky-500/10">
                                        <Zap size={20} className="fill-sky-400/20" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-base">Neynar</span>
                                        {neynarPowerChange !== 0 && (
                                            <div className={`flex items-center gap-0.5 text-xs font-bold ${neynarPowerChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {neynarPowerChange > 0 ? (
                                                    <ArrowUp size={12} strokeWidth={3} />
                                                ) : (
                                                    <ArrowDown size={12} strokeWidth={3} />
                                                )}
                                                <span>{Math.abs(neynarPowerChange)}</span>
                                            </div>
                                        )}
                                    </div>
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
                            <div className="p-4 flex items-center hover:bg-slate-800/30 transition-colors">
                                {/* Left: Label */}
                                <div className="flex-1 flex items-center gap-3 text-indigo-400">
                                    <div className="p-2 rounded-full bg-indigo-500/10">
                                        <Users size={20} className="fill-indigo-400/20" />
                                    </div>
                                    <span className="font-bold text-base">Team</span>
                                </div>

                                {/* Center: Avatars */}
                                <div className="flex justify-center -space-x-2">
                                    {teamMembers && teamMembers.length > 0 ? (
                                        teamMembers.map((member, i) => (
                                            <div 
                                                key={i} 
                                                className="w-6 h-6 rounded-full border border-slate-800 overflow-hidden bg-slate-700 relative z-0"
                                            >
                                                {member.pfpUrl ? (
                                                    <img src={member.pfpUrl} alt="Team" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <User size={12} className="text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-6 h-6"></div> // Spacer if empty
                                    )}
                                </div>

                                {/* Right: Score */}
                                <div className="flex-1 text-right">
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

export default InfoModal;