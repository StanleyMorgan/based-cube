
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Zap, Flame, Users, User, CircleDollarSign, BookOpen, X, ArrowRight, ShieldCheck, Trophy, Sparkles } from 'lucide-react';
import { TeamMember } from '../../types';

interface MenuDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    neynarPower: number;
    neynarPowerChange?: number;
    streakPower: number;
    teamPower?: number;
    rewards?: number;
    teamMembers?: TeamMember[];
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({ 
    isOpen, 
    onClose, 
    neynarPower, 
    neynarPowerChange = 0, 
    streakPower, 
    teamPower = 0, 
    rewards = 0, 
    teamMembers = [] 
}) => {
    const [view, setView] = useState<'main' | 'rules' | 'power'>('main');

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
                    />
                    <motion.div 
                        initial={{ y: '-100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 right-0 z-[101] bg-slate-900/95 border-b border-slate-700/50 backdrop-blur-xl shadow-2xl rounded-b-[2.5rem] overflow-hidden"
                    >
                        <div className="max-w-md mx-auto p-6 pt-12 pb-10">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-black tracking-widest text-white uppercase">
                                    {view === 'main' ? 'Tesseract Menu' : view === 'rules' ? 'Rules' : 'Power Breakdown'}
                                </h2>
                                <button onClick={onClose} className="p-2 rounded-full bg-slate-800/50 text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            {view === 'main' && (
                                <div className="space-y-4">
                                    <button 
                                        onClick={() => setView('rules')}
                                        className="w-full flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 rounded-2xl transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                                                <BookOpen size={24} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-slate-100">Rules & Mechanics</p>
                                                <p className="text-xs text-slate-500">How to play and earn</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={18} className="text-slate-600" />
                                    </button>

                                    <button 
                                        onClick={() => setView('power')}
                                        className="w-full flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 rounded-2xl transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
                                                <Zap size={24} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-slate-100">My Power Details</p>
                                                <p className="text-xs text-slate-500">Breakdown of your stats</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sky-400 font-mono font-bold">+{neynarPower + streakPower + teamPower}</span>
                                            <ArrowRight size={18} className="text-slate-600" />
                                        </div>
                                    </button>

                                    <div className="p-4 bg-slate-800/20 border border-slate-800/50 rounded-2xl flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <CircleDollarSign size={20} className="text-emerald-400" />
                                            <span className="text-sm font-medium text-slate-300">Total Rewards</span>
                                        </div>
                                        <span className="text-lg font-black text-emerald-400">${rewards.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            {view === 'rules' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                                                <Zap size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-100">Charge Tesseract</p>
                                                <p className="text-sm text-slate-400">Charge the cube once every 24 hours to collect energy and points.</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                                                <Flame size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-100">Power Multiplier</p>
                                                <p className="text-sm text-slate-400">Power = Neynar + Streak + Team. Higher power means more points per charge.</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                                <ShieldCheck size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-100">Daily Target</p>
                                                <p className="text-sm text-slate-400">Among today's players, a winner (Target) is selected to receive the Stream tomorrow.</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                                <Sparkles size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-100">Stream Rewards</p>
                                                <p className="text-sm text-slate-400">The Stream flows to the target's wallet in ETH or partner tokens based on daily participation.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => setView('main')}
                                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                                    >
                                        Back
                                    </button>
                                </div>
                            )}

                            {view === 'power' && (
                                <div className="space-y-4">
                                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden divide-y divide-slate-700/30">
                                        <div className="p-4 flex justify-between items-center">
                                            <div className="flex items-center gap-3 text-sky-400">
                                                <Zap size={20} />
                                                <span className="font-bold">Neynar Score</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {neynarPowerChange !== 0 && (
                                                    <span className={`text-xs font-bold ${neynarPowerChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {neynarPowerChange > 0 ? '↑' : '↓'} {Math.abs(neynarPowerChange)}
                                                    </span>
                                                )}
                                                <span className="font-black text-white">+{neynarPower}</span>
                                            </div>
                                        </div>

                                        <div className="p-4 flex justify-between items-center">
                                            <div className="flex items-center gap-3 text-orange-400">
                                                <Flame size={20} />
                                                <span className="font-bold">Active Streak</span>
                                            </div>
                                            <span className="font-black text-white">+{streakPower}</span>
                                        </div>

                                        <div className="p-4 flex flex-col gap-3">
                                            <div className="flex justify-between items-center text-indigo-400">
                                                <div className="flex items-center gap-3">
                                                    <Users size={20} />
                                                    <span className="font-bold">Team Power</span>
                                                </div>
                                                <span className="font-black text-white">+{teamPower}</span>
                                            </div>
                                            <div className="flex -space-x-2 pl-8">
                                                {teamMembers.map((member, i) => (
                                                    <div key={i} className="w-6 h-6 rounded-full border border-slate-800 bg-slate-700 overflow-hidden">
                                                        {member.pfpUrl ? (
                                                            <img src={member.pfpUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <User size={12} className="text-slate-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {teamMembers.length === 0 && <span className="text-xs text-slate-600">No team members yet</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => setView('main')}
                                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                                    >
                                        Back
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="w-full flex justify-center pb-3 opacity-20">
                            <div className="w-12 h-1 bg-slate-400 rounded-full" />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MenuDropdown;
