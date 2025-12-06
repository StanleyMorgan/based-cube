import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Star, ArrowUp, Share } from 'lucide-react';
import { LeaderboardEntry } from '../../types';
import Confetti from '../Confetti';
import Trophy from '../Trophy';
import RankTicker from '../RankTicker';
import AnimatedLeaderboardList from '../AnimatedLeaderboardList';

export interface SuccessModalData {
    show: boolean;
    points: number;
    oldRank: number;
    newRank: number;
    leaderboardSnippet?: LeaderboardEntry[];
    overtakenUser?: string;
}

interface SuccessModalProps {
    data: SuccessModalData | null;
    onClose: () => void;
    onShare: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ data, onClose, onShare }) => {
    return (
        <AnimatePresence>
            {data && data.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative z-50 flex flex-col items-center overflow-hidden"
                    >
                        {/* Background visual effects */}
                        {data.newRank < data.oldRank && <Confetti />}
                        
                        <button 
                            onClick={onClose} 
                            className="absolute top-4 right-4 text-slate-500 hover:text-white z-10"
                        >
                            <X size={24} />
                        </button>

                        <div className="mb-4 flex flex-col items-center relative z-10">
                            <div className="w-14 h-14 bg-yellow-400/20 rounded-full flex items-center justify-center mb-2 ring-2 ring-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                                <Star className="text-yellow-400 fill-yellow-400" size={28} />
                            </div>
                        </div>

                        <div className="w-full mt-2 bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 mb-4 flex flex-col relative z-10">
                             {/* Rank Summary */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Trophy className="text-sky-400" size={18} />
                                    <span className="text-slate-400 text-xs font-bold uppercase">Rank</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-bold text-lg flex items-center gap-1">
                                        #<RankTicker from={data.oldRank} to={data.newRank} />
                                    </span>
                                    {data.newRank < data.oldRank && (
                                        <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center">
                                            <ArrowUp size={12} /> Up
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Animated Leaderboard Snippet */}
                            {data.leaderboardSnippet && data.leaderboardSnippet.length > 0 && (
                                <AnimatedLeaderboardList 
                                    snippet={data.leaderboardSnippet}
                                    oldRank={data.oldRank}
                                    newRank={data.newRank}
                                />
                            )}
                        </div>

                        <button 
                            onClick={onShare}
                            className="w-full py-2.5 bg-sky-600/20 text-sky-200 border border-sky-500/30 rounded-xl font-bold text-base hover:bg-sky-600/30 transition-colors flex items-center justify-center gap-2 relative z-10"
                        >
                            <Share size={18} />
                            Share
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SuccessModal;