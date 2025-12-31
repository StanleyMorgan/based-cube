
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Orbit, Share, Zap } from 'lucide-react';
import Confetti from '../Confetti';

interface WinnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShare: () => void;
    rewards: number;
    historicalRewards: number;
}

const WinnerModal: React.FC<WinnerModalProps> = ({ isOpen, onClose, onShare, rewards, historicalRewards }) => {
    const todayRewards = rewards - historicalRewards;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
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
                        className="bg-slate-900 border-2 border-emerald-500/50 w-full max-w-sm rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.2)] relative z-10 flex flex-col items-center overflow-hidden text-center"
                    >
                        <Confetti />
                        
                        <button 
                            onClick={onClose} 
                            className="absolute top-4 right-4 text-slate-500 hover:text-white z-20"
                        >
                            <X size={24} />
                        </button>

                        <div className="mb-4 mt-2 relative">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center ring-4 ring-emerald-500/30 animate-pulse">
                                <Orbit className="text-emerald-400" size={40} />
                            </div>
                            <div className="absolute -top-1 -right-1 bg-yellow-400 text-black rounded-full p-1 shadow-lg">
                                <Zap size={16} fill="currentColor" />
                            </div>
                        </div>

                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">
                            Tesseract Activated
                        </h2>
                        
                        <p className="text-slate-400 text-sm mb-6 px-4">
                            You are attracting energy right now. 
                        </p>

                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 w-full mb-8 relative">
                            <div className="flex flex-col items-center">
                                <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Current stream:</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-4xl font-black text-white">
                                        ${todayRewards.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 w-full">
                            <button 
                                onClick={onShare}
                                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2"
                            >
                                <Share size={20} />
                                Boost Stream
                            </button>
                            
                            <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                                Share to boost stream
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default WinnerModal;
