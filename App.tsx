import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sdk } from '@farcaster/miniapp-sdk';
import { api, canClickCube, getClickPower } from './services/storage';
import { Tab, UserState } from './types';
import Cube from './components/Cube';
import Leaderboard from './components/Leaderboard';
import Navigation from './components/Navigation';
import Stats from './components/Stats';
import { Info, ArrowUp, Zap, Flame, Star, Wallet, Loader2 } from 'lucide-react';

// Wagmi & Contract imports
import { useAccount, useConnect, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { base } from 'wagmi/chains';
import { GMLoggerABI, CONTRACT_ADDRESS } from './src/abi';
import { parseEther } from 'viem';

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

  // Animation States
  const [showReward, setShowReward] = useState(false);
  const [showRankUp, setShowRankUp] = useState<{show: boolean, old: number, new: number} | null>(null);

  // Wagmi hooks
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContractAsync, isPending: isTxPending, data: txHash } = useWriteContract();
  
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
        // Use the fee from contract or default to 0 (though contract requires fee if set)
        const fee = gmFee ? BigInt(gmFee) : BigInt(0);
        
        // Using zero address as referrer for now, or could use a specific address
        const referrer = "0x0000000000000000000000000000000000000000";

        await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: GMLoggerABI,
            functionName: 'GM',
            args: [referrer as `0x${string}`],
            value: fee,
            account: address,
            chain: base,
        });

        // Optimistically proceed or wait for receipt (here we proceed to API call after signature)
        // Ideally we would wait for useWaitForTransactionReceipt but for UI speed we trigger API after wallet confirm.
        
        const oldRank = rank;
        
        // 2. Call API to update Score in DB
        const newState = await api.performClick(userState.fid);
        
        setUserState(newState);
        setRank(newState.rank);
        setCanClick(false);
        
        // Show reward animation
        setShowReward(true);
        setTimeout(() => setShowReward(false), 2000);

        // Show Rank Up animation if rank improved
        if (newState.rank < oldRank) {
            setShowRankUp({ show: true, old: oldRank, new: newState.rank });
            setTimeout(() => setShowRankUp(null), 3000);
        }
    } catch (e) {
        console.error("Click failed", e);
        // User might have rejected transaction
    } finally {
        setIsProcessing(false);
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

                 {/* Floating Rank Up Animation */}
                 <AnimatePresence>
                  {showRankUp && (
                    <motion.div
                      initial={{ opacity: 0, y: 50, scale: 0.8 }}
                      animate={{ opacity: 1, y: -160, scale: 1 }}
                      exit={{ opacity: 0, y: -200 }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 w-64"
                    >
                      <div className="bg-slate-900/90 border border-emerald-500/50 backdrop-blur-md px-4 py-3 rounded-xl shadow-2xl flex items-center justify-center gap-3">
                         <div className="bg-emerald-500/20 p-2 rounded-full">
                            <ArrowUp className="text-emerald-400" size={24} />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-emerald-400 font-bold uppercase text-xs tracking-wider">Rank Up!</span>
                            <div className="flex items-center gap-2 text-white font-bold">
                                <span className="text-slate-400">#{showRankUp.old}</span>
                                <span className="text-emerald-500">→</span>
                                <span className="text-xl">#{showRankUp.new}</span>
                            </div>
                         </div>
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

export default App;