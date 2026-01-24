import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check, Zap, AlertTriangle } from 'lucide-react';
import { UserState } from '../../types';

interface TierModalProps {
    isOpen: boolean;
    onClose: () => void;
    userState: UserState;
    onConfirm: (version: number) => void;
}

const TierModal: React.FC<TierModalProps> = ({ isOpen, onClose, userState, onConfirm }) => {
    const [selectedVersion, setSelectedVersion] = useState<number>(userState.version || 1);

    const handleConfirm = () => {
        onConfirm(selectedVersion);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white uppercase tracking-wider">Select Tier</h2>
                            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            {/* Tier 1 */}
                            <button 
                                onClick={() => setSelectedVersion(1)}
                                className={`w-full p-4 rounded-2xl border transition-all flex flex-col text-left relative overflow-hidden ${
                                    selectedVersion === 1 
                                    ? 'bg-sky-900/30 border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.2)]' 
                                    : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'
                                }`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sky-400 font-black text-lg">Tier 1</span>
                                    {selectedVersion === 1 && <div className="bg-sky-500 rounded-full p-0.5"><Check size={12} className="text-white" /></div>}
                                </div>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">standard game</p>
                            </button>

                            {/* Tier 2 */}
                            <button 
                                onClick={() => setSelectedVersion(2)}
                                className={`w-full p-4 rounded-2xl border transition-all flex flex-col text-left relative overflow-hidden ${
                                    selectedVersion === 2 
                                    ? 'bg-purple-900/30 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                                    : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'
                                }`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-purple-400 font-black text-lg">Tier 2</span>
                                        <Zap size={14} className="text-purple-400 fill-purple-400/20" />
                                    </div>
                                    {selectedVersion === 2 && <div className="bg-purple-500 rounded-full p-0.5"><Check size={12} className="text-white" /></div>}
                                </div>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">Higher rewards, higher winrate, X10 fees</p>
                            </button>
                        </div>

                        {/* Warning */}
                        <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-3 mb-6 flex gap-3">
                            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
                            <p className="text-[10px] text-amber-300 font-bold leading-tight uppercase tracking-tight">
                                Important: Switching back will be available no earlier than in 24 hours.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={onClose}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <X size={20} />
                            </button>
                            <button 
                                onClick={handleConfirm}
                                className="flex-[2] py-3 bg-white text-black hover:bg-slate-200 font-black rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Check size={20} />
                                Confirm
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TierModal;