
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Zap, Flame, Star, User, Users, Loader2, CircleDollarSign } from 'lucide-react';
import { LeaderboardEntry } from '../../types';
import { api } from '../../services/storage';
import { sdk } from '@farcaster/miniapp-sdk';

interface PlayerStatsModalProps {
    player: LeaderboardEntry | null;
    onClose: () => void;
    onSelectPlayer: (player: LeaderboardEntry) => void;
}

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ player, onClose, onSelectPlayer }) => {
    const [loadingFid, setLoadingFid] = useState<number | null>(null);
    
    const handleProfileClick = async (fid: number) => {
        setLoadingFid(fid);
        try {
            // Fetch the clicked player's stats to show their card
            const playerData = await api.getUserProfile(fid);
            onSelectPlayer(playerData);
        } catch (e) {
            console.warn("Failed to load user profile", e);
        } finally {
            setLoadingFid(null);
        }
    };

    const handleMainAvatarClick = () => {
        if (!player) return;
        // player.id is the FID string in our LeaderboardEntry type
        const fid = parseInt(player.id);
        if (!isNaN(fid)) {
            sdk.actions.viewProfile({ fid });
        }
    };

    if (!player) return null;

    // Calculate power stats based on raw data
    // Use Math.round to handle precision (0.57 * 100 = 57)
    const neynarPower = Math.round(100 * (player.neynarScore || 0));
    const neynarPowerChange = player.neynarPowerChange || 0;
    const streakPower = Math.min(player.streak, 30);
    const teamPower = player.teamScore || 0;
    const totalRewards = player.actualRewards || 0;
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
                            <div className="flex items-center gap-4 mb-3">
                                {/* Tier Badge - Left Position */}
                                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-black backdrop-blur-md shadow-lg ${
                                    player.version === 2 
                                    ? 'bg-purple-900/80 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.5)]' 
                                    : 'bg-slate-800/80 text-slate-400 border-slate-700/50'
                                }`}>
                                    T{player.version || 1}
                                </div>

                                <button 
                                    onClick={handleMainAvatarClick}
                                    className="relative transition-transform hover:scale-105 active:scale-95"
                                >
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
                                </button>

                                {/* Invisible Spacer to maintain avatar centering */}
                                <div className="w-10 h-10 invisible" aria-hidden="true" />
                            </div>
                            <h2 className="text-xl font-bold text-white">{player.username}</h2>
                        </div>

                        {/* Consolidated Stats Block */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl overflow-hidden divide-y divide-slate-700/50">
                            
                            {/* Neynar */}
                            <div className="p-4 flex justify-between items-center relative hover:bg-slate-800/30 transition-colors">
                                {/* Left: Label */}
                                <div className="flex items-center gap-3 text-sky-400">
                                    <div className="p-2 rounded-full bg-sky-500/10">
                                        <Zap size={20} className="fill-sky-400/20" />
                                    </div>
                                    <span className="font-bold text-base">Neynar</span>
                                </div>

                                {/* Center (60%): Change Indicator */}
                                {neynarPowerChange !== 0 && (
                                    <div className={`absolute left-[60%] -translate-x-1/2 flex items-center gap-0.5 font-bold text-base ${neynarPowerChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        <span>{neynarPowerChange > 0 ? '▴' : '▾'}</span>
                                        <span>{Math.abs(neynarPowerChange)}</span>
                                    </div>
                                )}

                                {/* Right: Score */}
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
                            <div className="p-4 flex justify-between items-center relative hover:bg-slate-800/30 transition-colors">
                                {/* Left: Label */}
                                <div className="flex-1 flex items-center gap-3 text-indigo-400">
                                    <div className="p-2 rounded-full bg-indigo-500/10">
                                        <Users size={20} className="fill-indigo-400/20" />
                                    </div>
                                    <span className="font-bold text-base">Team</span>
                                </div>

                                {/* Center (60%): Avatars */}
                                <div className="absolute left-[60%] -translate-x-1/2 flex justify-center -space-x-2">
                                    {teamMembers && teamMembers.length > 0 ? (
                                        teamMembers.map((member, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => handleProfileClick(member.fid)}
                                                disabled={loadingFid !== null}
                                                className="w-6 h-6 rounded-full border border-slate-800 overflow-hidden bg-slate-700 hover:scale-110 transition-transform cursor-pointer relative z-0 hover:z-10 disabled:opacity-50"
                                            >
                                                {loadingFid === member.fid ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                        <Loader2 size={12} className="animate-spin text-white" />
                                                    </div>
                                                ) : member.pfpUrl ? (
                                                    <img src={member.pfpUrl} alt="Team" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <User size={12} className="text-slate-400" />
                                                    </div>
                                                )}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="w-6 h-6"></div> // Spacer
                                    )}
                                </div>

                                {/* Right: Score */}
                                <div className="flex-1 text-right">
                                    <span className="text-lg font-black text-white">+{teamPower}</span>
                                </div>
                            </div>

                            {/* Earned */}
                            <div className="p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-3 text-emerald-400">
                                    <div className="p-2 rounded-full bg-emerald-500/10">
                                        <CircleDollarSign size={20} className="fill-emerald-400/20" />
                                    </div>
                                    <span className="font-bold text-base">Earned</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-lg font-black text-white">
                                        ${totalRewards.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PlayerStatsModal;
