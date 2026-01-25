
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Info, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export type SystemModalType = 'info' | 'error' | 'warning' | 'success';

export interface SystemModalData {
    show: boolean;
    title: string;
    message: string;
    type: SystemModalType;
}

interface SystemModalProps {
    data: SystemModalData | null;
    onClose: () => void;
}

const SystemModal: React.FC<SystemModalProps> = ({ data, onClose }) => {
    if (!data) return null;

    const getIcon = () => {
        switch (data.type) {
            case 'error': return <AlertCircle className="text-red-400" size={28} />;
            case 'warning': return <AlertTriangle className="text-amber-400" size={28} />;
            case 'success': return <CheckCircle2 className="text-emerald-400" size={28} />;
            default: return <Info className="text-sky-400" size={28} />;
        }
    };

    const getThemeColor = () => {
        switch (data.type) {
            case 'error': return 'border-red-500/50 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]';
            case 'warning': return 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]';
            case 'success': return 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]';
            default: return 'border-sky-500/50 bg-sky-500/10 shadow-[0_0_20px_rgba(14,165,233,0.15)]';
        }
    };

    const getButtonColor = () => {
        switch (data.type) {
            case 'error': return 'bg-red-600 hover:bg-red-500';
            case 'warning': return 'bg-amber-600 hover:bg-amber-500';
            case 'success': return 'bg-emerald-600 hover:bg-emerald-500';
            default: return 'bg-sky-600 hover:bg-sky-500';
        }
    };

    return (
        <AnimatePresence>
            {data.show && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`bg-slate-900 border w-full max-w-sm rounded-3xl p-6 relative z-10 flex flex-col items-center text-center ${getThemeColor()}`}
                    >
                        <button 
                            onClick={onClose} 
                            className="absolute top-4 right-4 text-slate-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-4 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                            {getIcon()}
                        </div>

                        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">
                            {data.title}
                        </h3>
                        
                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                            {data.message}
                        </p>

                        <button 
                            onClick={onClose}
                            className={`w-full py-3 ${getButtonColor()} text-white rounded-xl font-bold transition-all shadow-lg active:scale-95`}
                        >
                            Got it
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SystemModal;
