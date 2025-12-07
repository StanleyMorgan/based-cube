import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sdk } from '@farcaster/miniapp-sdk';
import { api, canClickCube, getClickPower } from './services/storage';
import { Tab, UserState, LeaderboardEntry } from './types';
import Cube from './components/Cube';
import Leaderboard from './components/Leaderboard';
import Navigation from './components/Navigation';
import Stats from './components/Stats';
import InfoModal from './components/modals/InfoModal';
import SuccessModal, { SuccessModalData } from './components/modals/SuccessModal';
import { Info, Wallet, Loader2 } from 'lucide-react';

// Wagmi & Contract imports
import { useAccount, useConnect, useWriteContract, useReadContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { GMLoggerABI, CONTRACT_ADDRESS } from './src/abi';

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
  
  const [successModal, setSuccessModal] = useState<SuccessModalData | null>(null);

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
            
            // Priority: Username (handle) -> DisplayName -> 'Player'
            const username = context.user?.username || context.user?.displayName || 'Player';
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
        let overtakenUser: string | undefined;

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

                // Find overtaken user if we ranked up
                if (newState.rank < oldRank) {
                    // The person we displaced is now at (our_rank + 1)
                    const overtakenEntry = allEntries.find(e => e.rank === newState.rank + 1);
                    if (overtakenEntry) {
                        overtakenUser = overtakenEntry.username;
                    }
                }
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
            leaderboardSnippet: lbSnippet,
            overtakenUser: overtakenUser
        });

    } catch (e) {
        console.error("Click failed", e);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    if (!successModal) return;

    let rankText = successModal.newRank < successModal.oldRank 
        ? `I just ranked up to #${successModal.newRank}!` 
        : `Current Rank: #${successModal.newRank}`;

    if (successModal.overtakenUser) {
        rankText += ` Overtook @${successModal.overtakenUser} 🏎️💨`;
    }

    const text = `I collected +${successModal.points} Power on Tesseract! 🧊\n${rankText}\nStart your streak:`;
    const embedUrl = 'https://farcaster.xyz/miniapps/Xsf0F9GOSyy3/tesseract'; // Production URL

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

      {/* Modals */}
      <SuccessModal
          data={successModal}
          onClose={() => setSuccessModal(null)}
          onShare={handleShare}
      />

      <InfoModal
          isOpen={showInfo}
          onClose={() => setShowInfo(false)}
          neynarPower={neynarPowerCalc}
          streakPower={streakPowerCalc}
      />

      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;