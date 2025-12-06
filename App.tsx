import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { sdk } from '@farcaster/miniapp-sdk';
import { api, canClickCube, getClickPower } from './services/storage';
import { Tab, UserState, LeaderboardEntry } from './types';
import Cube from './components/Cube';
import Leaderboard from './components/Leaderboard';
import Navigation from './components/Navigation';
import Stats from './components/Stats';
import { Info, ArrowUp, Zap, Flame, Star, Wallet, Loader2, Share, X, User } from 'lucide-react';

// Wagmi & Contract imports
import { useAccount, useConnect, useWriteContract, useReadContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { GMLoggerABI, CONTRACT_ADDRESS } from './src/abi';

// --- Animated Components ---

const RankTicker = ({ from, to }: { from: number; to: number }) => {
  const count = useMotionValue(from);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    // Animate from old rank to new rank over 1.5 seconds
    const controls = animate(count, to, { duration: 1.5, ease: "circOut" });
    return controls.stop;
  }, [from, to]);

  return <motion.span>{rounded}</motion.span>;
};

const Confetti = () => {
  // Simple particle explosion effect
  const particles = Array.from({ length: 20 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-yellow-400' : 'bg-sky-400'}`}
          initial={{ 
            x: "50%", 
            y: "50%", 
            opacity: 1, 
            scale: 0 
          }}
          animate={{ 
            x: `${50 + (Math.random() - 0.5) * 150}%`, 
            y: `${50 + (Math.random() - 0.5) * 150}%`, 
            opacity: 0, 
            scale: Math.random() * 1.5 
          }}
          transition={{ 
            duration: 1 + Math.random(), 
            ease: "easeOut" 
          }}
        />
      ))}
    </div>
  );
};

// Component to handle the swapping animation
const AnimatedLeaderboardList = ({ snippet, oldRank, newRank }: { snippet: LeaderboardEntry[], oldRank: number, newRank: number }) => {
    const isRankUp = newRank < oldRank;

    return (
        <div className="space-y-1.5 pt-3 border-t border-slate-700/50 relative">
            {snippet.map((entry) => {
                let initialY = 0;
                let initialOpacity = 1;
                let zIndex = 0;

                // Animation Logic for Rank Up
                if (isRankUp) {
                    if (entry.isCurrentUser) {
                        // User moves UP into position (starts lower)
                        initialY = 48; // Approximate height of a row + gap
                        zIndex = 10;
                    } else if (entry.rank === newRank + 1) {
                        // The person immediately below us (who we overtook) moves DOWN into position (starts higher)
                        initialY = -48;
                    } else if (entry.rank < newRank) {
                        // People above us fade in / slide down slightly to reveal
                        initialY = -20;
                        initialOpacity = 0;
                    }
                }

                return (
                    <motion.div
                        key={entry.id}
                        initial={{ y: initialY, opacity: initialOpacity }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 60, 
                            damping: 15, 
                            delay: 0.2 // Small delay to let modal open first
                        }}
                        style={{ zIndex }}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm relative ${
                            entry.isCurrentUser 
                                ? 'bg-sky-500/20 border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]' 
                                : 'bg-slate-700/20 border border-transparent opacity-80'
                        }`}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`font-mono font-bold w-6 text-center ${entry.isCurrentUser ? 'text-sky-300' : 'text-slate-500'}`}>
                                #{entry.rank}
                            </span>
                            {entry.pfpUrl ? (
                                <img src={entry.pfpUrl} alt="" className="w-5 h-5 rounded-full" />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center">
                                    <User size={12} className="text-slate-400" />
                                </div>
                            )}
                            <span className={`truncate max-w-[80px] ${entry.isCurrentUser ? 'font-bold text-white' : 'text-slate-300'}`}>
                                {entry.username}
                            </span>
                        </div>
                        <span className="font-mono text-xs text-slate-400">
                            {entry.score.toLocaleString()}
                        </span>
                        
                        {/* Visual indicator for the user being animated */}
                        {entry.isCurrentUser && isRankUp && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 }}
                                className="absolute -right-1 -top-1 w-3 h-3 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg"
                            >
                                <ArrowUp size={8} className="text-black stroke-[3px]" />
                            </motion.div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.GAME);
  
  // Initial state with defaults
  const [userState, setUserState] = useState<UserState>({
    score: 0,
    streak: 0,
    username: 'Loading...',
    lastClickDate: null,
    neynarScore: 0
  });
  
  const [canClick, setCanClick] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  
  // Stats State
  const [rank, setRank] = useState(0);
  const [clickPower, setClickPower] = useState(0);

  // Animation & Modal States
  const [showReward, setShowReward] = useState(false);
  
  const [successModal, setSuccessModal] = useState<{
    show: boolean;
    points: number;
    oldRank: number;
    newRank: number;
    leaderboardSnippet?: LeaderboardEntry[];
  } | null>(null);

  // Wagmi hooks
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContractAsync, isPending: isTxPending } = useWriteContract();
  
  // Read Fee from contract
  const { data: gmFee } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: GMLoggerABI,
    functionName: 'gmFee',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Farcaster SDK and Sync User with DB
  useEffect(() => {
    const initApp = async () => {
        try {
            const context = await sdk.context;
            
            // Default user data if running outside Farcaster (e.g. dev)
            const fid = context.user?.fid || 1001; 
            const username = context.user?.displayName || context.user?.username || 'Player';
            const pfpUrl = context.user?.pfpUrl;

            // Sync with DB
            const syncedUser = await api.syncUser(fid, username, pfpUrl);
            
            setUserState(syncedUser);
            setRank(syncedUser.rank);
            
            // Try to connect wallet if available in connector
            if (!isConnected && connectors.length > 0) {
                 connect({ connector: connectors[0] });
            }

            await sdk.actions.ready();
        } catch (error) {
            console.error('Failed to initialize app:', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    initApp();
  }, []);

  // Update derived state when userState changes
  useEffect(() => {
    setCanClick(canClickCube(userState.lastClickDate));
    setClickPower(getClickPower(userState.streak, userState.neynarScore));
  }, [userState]);

  const handleCubeClick = async () => {
    if (!canClick || !userState.fid) return;
    if (isProcessing || isTxPending) return;

    // Check Wallet Connection
    if (!isConnected || !address) {
        if (connectors.length > 0) {
            connect({ connector: connectors[0] });
            return;
        } else {
             alert("Please connect your wallet to play.");
             return;
        }
    }

    setIsProcessing(true);

    try {
        // 1. Execute On-Chain GM
        const fee = gmFee ? BigInt(gmFee) : BigInt(0);
        // Using zero address as referrer for now
        const referrer = "0x0000000000000000000000000000000000000000";

        await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: GMLoggerABI,
            functionName: 'GM',
            args: [referrer as `0x${string}`],
            value: fee,
            account: address,
            chain: baseSepolia,
        });
        
        const oldRank = rank;
        
        // 2. Call API to update Score in DB
        const newState = await api.performClick(userState.fid);
        
        // 3. Fetch Leaderboard to show visualization (Snippet)
        // We fetch the full leaderboard and slice it around the user
        let lbSnippet: LeaderboardEntry[] = [];
        try {
            const allEntries = await api.getLeaderboard(userState.fid);
            const userIndex = allEntries.findIndex(e => e.isCurrentUser);
            
            if (userIndex !== -1) {
                // Determine slice window. 
                // Ideally we want to show [Above, Me, Below]
                let start = Math.max(0, userIndex - 1);
                let end = Math.min(allEntries.length, userIndex + 2);
                
                // Adjust if we are at the top (Show 1, 2, 3)
                if (userIndex === 0) end = Math.min(allEntries.length, 3);
                
                lbSnippet = allEntries.slice(start, end);
            }
        } catch (err) {
            console.warn("Could not fetch leaderboard for snippet", err);
        }

        setUserState(newState);
        setRank(newState.rank);
        setCanClick(false);
        
        // Show reward animation (floating text)
        setShowReward(true);
        setTimeout(() => setShowReward(false), 2000);

        // Show Success/Share Modal
        setSuccessModal({
            show: true,
            points: clickPower,
            oldRank: oldRank,
            newRank: newState.rank,
            leaderboardSnippet: lbSnippet
        });

    } catch (e) {
        console.error("Click failed", e);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    if (!successModal) return;

    const rankText = successModal.newRank < successModal.oldRank 
        ? `I just ranked up to #${successModal.newRank}!` 
        : `Current Rank: #${successModal.newRank}`;

    const text = `I collected +${successModal.points} Power on Tesseract! 🧊\n\n${rankText}\n\nStart your streak:`;
    const embedUrl = 'https://tesseract-base.vercel.app'; // Production URL

    try {
        await sdk.actions.composeCast({
            text: text,
            embeds: [embedUrl]
        });
        setSuccessModal(null);
    } catch (e) {
        console.error("Share failed", e);
    }
  };

  const neynarPowerCalc = Math.floor(100 * (userState.neynarScore || 0));
  const streakPowerCalc = Math.min(userState.streak, 30);

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
              <div className="animate-pulse">Loading Tesseract...</div>
          </div>
      );
  }

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col relative overflow-hidden">
      
      {/* Background Ambient Light */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="p-6 flex justify-between items-center z-10 flex-shrink-0">
        <h1 className="text-xl font-bold tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          TESSERACT
        </h1>
        <div className="flex gap-2">
            {!isConnected && (
                <button onClick={() => connectors[0] && connect({ connector: connectors[0] })} className="p-2 rounded-full bg-slate-800/50 text-slate-400 border border-slate-700/50">
                    <Wallet size={20} />
                </button>
            )}
            <button 
                onClick={() => setShowInfo(true)}
                className="p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white transition-colors border border-slate-700/50"
            >
                <Info size={20} />
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow relative z-10 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === Tab.GAME ? (
            <motion.div
              key="game"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-grow flex flex-col items-center justify-center pb-24 overflow-y-auto"
            >
              <Stats 
                userState={userState} 
                canClick={canClick} 
                rank={rank}
                clickPower={clickPower}
              />
              
              <div className="relative">
                {/* Overlay for processing state */}
                {(isProcessing || isTxPending) && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl">
                        <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-2" />
                        <span className="text-sm font-bold text-sky-100">Confirming...</span>
                    </div>
                )}
                
                <Cube canClick={canClick} onClick={handleCubeClick} />
                
                {/* Floating Reward Animation (Score) */}
                <AnimatePresence>
                  {showReward && (
                    <motion.div
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -100, scale: 1.5 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 flex flex-col items-center"
                    >
                      <div className="text-4xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                        +{clickPower}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
            </motion.div>
          ) : (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-grow h-full overflow-hidden"
            >
              <Leaderboard currentUser={userState} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Success / Share Modal */}
      <AnimatePresence>
        {successModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSuccessModal(null)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative z-50 flex flex-col items-center overflow-hidden"
                >
                    {/* Background visual effects */}
                    {successModal.newRank < successModal.oldRank && <Confetti />}
                    
                    <button 
                        onClick={() => setSuccessModal(null)} 
                        className="absolute top-4 right-4 text-slate-500 hover:text-white z-10"
                    >
                        <X size={24} />
                    </button>

                    <div className="mb-4 flex flex-col items-center relative z-10">
                        <div className="w-14 h-14 bg-yellow-400/20 rounded-full flex items-center justify-center mb-2 ring-2 ring-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                            <Star className="text-yellow-400 fill-yellow-400" size={28} />
                        </div>
                        <h2 className="text-2xl font-black text-white">+{successModal.points}</h2>
                        <span className="text-slate-400 uppercase tracking-widest text-xs font-bold">Power Collected</span>
                    </div>

                    <div className="w-full bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 mb-4 flex flex-col relative z-10">
                         {/* Rank Summary */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Trophy className="text-sky-400" size={18} />
                                <span className="text-slate-400 text-xs font-bold uppercase">Rank</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold text-lg flex items-center gap-1">
                                    #<RankTicker from={successModal.oldRank} to={successModal.newRank} />
                                </span>
                                {successModal.newRank < successModal.oldRank && (
                                    <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center">
                                        <ArrowUp size={12} /> Up
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Animated Leaderboard Snippet */}
                        {successModal.leaderboardSnippet && successModal.leaderboardSnippet.length > 0 && (
                            <AnimatedLeaderboardList 
                                snippet={successModal.leaderboardSnippet}
                                oldRank={successModal.oldRank}
                                newRank={successModal.newRank}
                            />
                        )}
                    </div>

                    <button 
                        onClick={handleShare}
                        className="w-full py-3 bg-white text-black rounded-xl font-bold text-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 relative z-10"
                    >
                        <Share size={20} />
                        Share Result
                    </button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowInfo(false)}
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

                    <div className="space-y-4">
                        {/* Neynar */}
                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex justify-between items-center">
                            <div className="flex items-center gap-3 text-sky-400">
                                <Zap size={22} className="fill-sky-400/20" />
                                <span className="font-bold text-lg">Neynar</span>
                            </div>
                            <span className="text-2xl font-black text-white">+{neynarPowerCalc}</span>
                        </div>

                        {/* Streak */}
                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex justify-between items-center">
                            <div className="flex items-center gap-3 text-orange-400">
                                <Flame size={22} className="fill-orange-400/20" />
                                <span className="font-bold text-lg">Streak</span>
                            </div>
                            <span className="text-2xl font-black text-white">+{streakPowerCalc}</span>
                        </div>

                        {/* Bonus */}
                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex justify-between items-center">
                            <div className="flex items-center gap-3 text-yellow-400">
                                <Star size={22} className="fill-yellow-400/20" />
                                <span className="font-bold text-lg">Bonus</span>
                            </div>
                            <span className="text-2xl font-black text-white">+0</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

// Helper component for Trophy in the modal
const Trophy = ({ size, className }: { size?: number, className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size || 24} 
        height={size || 24} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);

export default App;