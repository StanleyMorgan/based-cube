
import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sdk } from '@farcaster/miniapp-sdk';
import { api, canClickCube, getClickPower } from './services/storage';
import { Tab, UserState, LeaderboardEntry } from './types';
import Cube from './components/Cube';
import Leaderboard from './components/Leaderboard';
import Tasks from './components/Tasks';
import Navigation from './components/Navigation';
import Stats from './components/Stats';
import MenuDropdown from './components/modals/MenuDropdown';
import PlayerStatsModal from './components/modals/PlayerStatsModal';
import SuccessModal, { SuccessModalData } from './components/modals/SuccessModal';
import WinnerModal from './components/modals/WinnerModal';
import { Menu, Wallet, Loader2 } from 'lucide-react';

// Wagmi & Contract imports
import { useAccount, useConnect, useWriteContract, useReadContract } from 'wagmi';
import { base } from 'wagmi/chains';
import { GMLoggerABI } from './src/abi';
import { readContract } from 'wagmi/actions';
import { config as wagmiConfig } from './src/config';

// Animation variants for sliding tabs
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.GAME);
  const [direction, setDirection] = useState(0);
  
  // Initial state with defaults
  const [userState, setUserState] = useState<UserState>({
    score: 0,
    rewards: 0,
    actualRewards: 0,
    streak: 0,
    username: 'Loading...',
    lastClickDate: null,
    neynarScore: 0,
    teamScore: 0,
    teamMembers: [],
    contractAddress: undefined,
    version: 1,
    streamTarget: false,
    streamPercent: 0,
    unitPrice: 0
  });
  
  const [canClick, setCanClick] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [hasNewTask, setHasNewTask] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  
  // Stats State
  const [rank, setRank] = useState(0);
  const [clickPower, setClickPower] = useState(0);

  // Animation & Modal States
  const [showReward, setShowReward] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);
  
  const [successModal, setSuccessModal] = useState<SuccessModalData | null>(null);

  // Wagmi hooks
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContractAsync, isPending: isTxPending } = useWriteContract();
  
  // Read Fee from contract (chargeFee for V3/V4)
  const { data: contractFee } = useReadContract({
    address: userState.contractAddress as `0x${string}`,
    abi: GMLoggerABI,
    functionName: 'chargeFee',
  });

  // Read Last Stream Details (Day, Count, Target) from contract
  // We use this instead of previousActiveDay because in V3 that variable is internal
  const { data: lastStreamData } = useReadContract({
    address: userState.contractAddress as `0x${string}`,
    abi: GMLoggerABI,
    functionName: 'getLastStream',
  });

  // Read current target from contract
  const { data: currentDayStatus } = useReadContract({
    address: userState.contractAddress as `0x${string}`,
    abi: GMLoggerABI,
    functionName: 'getCurrentDayStatus',
  });

  // Extract current stream target address
  const contractTargetAddress = useMemo(() => {
    if (!currentDayStatus) return undefined;
    return (currentDayStatus as any)[1] as string;
  }, [currentDayStatus]);

  const contractCollectedFee = useMemo(() => {
    if (!currentDayStatus) return 0n;
    return (currentDayStatus as any)[3] as bigint;
  }, [currentDayStatus]);

  // Sync Live Rewards to DB for current target whenever status changes
  useEffect(() => {
    if (contractTargetAddress && contractCollectedFee > 0n) {
        api.syncRewards(contractTargetAddress, contractCollectedFee.toString())
           .catch(err => console.error("Failed to sync live rewards", err));
    }
  }, [contractTargetAddress, contractCollectedFee]);

  const isContractTarget = useMemo(() => {
    if (!contractTargetAddress || !address) return false;
    return contractTargetAddress.toLowerCase() === address.toLowerCase();
  }, [contractTargetAddress, address]);

  const [isProcessing, setIsProcessing] = useState(false);

  // Function to check tasks for the notification badge
  const checkTasks = async (fid: number) => {
    try {
      const tasks = await api.getTasks(fid);
      if (tasks.length > 0) {
        // Last task by created_at (since API orders by created_at ASC)
        const latestTask = tasks[tasks.length - 1];
        setHasNewTask(latestTask && latestTask.status === 'start');
      } else {
        setHasNewTask(false);
      }
    } catch (e) {
      console.error("Failed to check tasks for badge", e);
    }
  };

  // Trigger Winner Modal if user is the target or streamTarget override is enabled
  useEffect(() => {
    // We show the modal on every app initialization/render if the user is the target.
    // Removed sessionStorage check to ensure it appears on every fresh enter as requested.
    if ((isContractTarget || userState.streamTarget) && !isLoading) {
      setShowWinnerModal(true);
    }
  }, [isContractTarget, userState.streamTarget, isLoading]);

  // Background History Sync
  useEffect(() => {
    const syncHistory = async () => {
      // Use lastStreamData which contains [day, count, target]
      if (!lastStreamData || !userState.contractAddress) return;
      
      try {
        const [dayNum, playerCount, targetAddr] = lastStreamData as [bigint, bigint, string];
        const contractDay = Number(dayNum);
        
        if (contractDay === 0) return;

        // Pass current user version to get versioned history
        const dbLastDay = await api.getLatestSyncedDay(userState.version || 1);

        // If the contract has a newer closed day than our database, sync it
        if (contractDay > dbLastDay) {
          await api.syncHistory({
            day_number: contractDay,
            player_count: Number(playerCount),
            target_address: targetAddr
          }, userState.version || 1);
          console.log(`History auto-synced for day ${contractDay} (Tier ${userState.version || 1})`);
        }
      } catch (err) {
        console.error("Background history sync failed", err);
      }
    };

    if (userState.contractAddress && lastStreamData) {
        syncHistory();
    }
  }, [lastStreamData, userState.contractAddress, userState.version]);

  // Initialize Farcaster SDK and Sync User with DB
  useEffect(() => {
    const initApp = async () => {
        try {
            const context = await sdk.context;
            
            // Check for referral param in URL
            const params = new URLSearchParams(window.location.search);
            const refParam = params.get('ref');
            const referrerFid = refParam ? parseInt(refParam) : undefined;

            // Default user data if running outside Farcaster (e.g. dev)
            const fid = context.user?.fid || 1001; 
            
            // Priority: Username (handle) -> DisplayName -> 'Player'
            const username = context.user?.username || context.user?.displayName || 'Player';
            const pfpUrl = context.user?.pfpUrl;

            // Sync with DB (pass address if available, though unlikely on first render)
            // Also pass referrerFid if found in URL
            const syncedUser = await api.syncUser(fid, username, pfpUrl, address, referrerFid);
            
            setUserState(syncedUser);
            setRank(syncedUser.rank);

            // Check for new tasks for the badge
            // Corrected: use local 'fid' variable instead of non-existent 'userFid'
            checkTasks(fid);
            
            // Try to connect wallet if available in connector
            if (!isConnected && connectors.length > 0) {
                 connect({ connector: connectors[0] });
            }

            // Prompt user to add the app (SDK handles check if already added)
            try {
                await sdk.actions.addMiniApp();
            } catch (e) {
                console.warn("Add MiniApp action failed or rejected", e);
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

  // Sync wallet address when it changes and we have a valid user
  useEffect(() => {
    if (userState.fid && address && userState.username !== 'Loading...') {
       // Check if we need to update the address on the backend
       if (userState.primaryAddress !== address) {
           api.syncUser(userState.fid, userState.username, userState.pfpUrl, address)
              .then(newUserState => {
                  setUserState(newUserState);
              })
              .catch(err => console.error("Failed to sync wallet address", err));
       }
    }
  }, [address, userState.fid, userState.username, userState.pfpUrl, userState.primaryAddress]);

  // Update derived state when userState changes
  useEffect(() => {
    setCanClick(canClickCube(userState.lastClickDate, userState.fid));
    setClickPower(getClickPower(userState.streak, userState.neynarScore, userState.teamScore || 0));
  }, [userState]);

  const handleCubeClick = async () => {
    if (!canClick || !userState.fid || !userState.contractAddress) return;
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
        const fee = contractFee ? BigInt(contractFee) : BigInt(0);
        const referrer = userState.referrerAddress || "0x0000000000000000000000000000000000000000";

        // Logic using V3/V4 signature (Referrer, Points, Day, Signature)
        const { points, day, signature } = await api.getSign(userState.fid, address);
        
        // Execute On-Chain Charge with Signature
        await writeContractAsync({
            address: userState.contractAddress as `0x${string}`,
            abi: GMLoggerABI,
            functionName: 'Charge',
            args: [referrer as `0x${string}`, BigInt(points), BigInt(day), signature as `0x${string}`],
            value: fee,
            account: address,
            chain: base,
        });
        
        const oldRank = rank;
        const oldScore = userState.score;
        
        // 3. Call API to update Score in DB
        const newState = await api.performClick(userState.fid);
        
        // Calculate actual points earned
        const earnedPoints = newState.score - oldScore;
        
        // 4. Fetch Leaderboard to show visualization (Snippet)
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
        // Correcting rankResult error by using newState directly
        setRank(newState.rank);
        setCanClick(false);
        
        // Show reward animation (floating text)
        setShowReward(true);
        setTimeout(() => setShowReward(false), 2000);

        // Show Success/Share Modal
        setSuccessModal({
            show: true,
            points: earnedPoints,
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

    const text = `I collected +${successModal.points} Power on Tesseract! 🧊\n${rankText}\nUse your Neynar Superpower:`;
    
    // Use a clean URL without score to improve caching efficiency
    const embedUrl = `https://tesseract-base.vercel.app/api/share/frame?fid=${userState.fid}`;

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

  const handleWinnerShare = async () => {
    const todayRewards = userState.actualRewards - userState.rewards;
    const text = `I’ve activated the Tesseract 🧊\nEarned $${todayRewards.toFixed(2)} so far today.\nJoin in — you could be next:`;
    const embedUrl = `https://tesseract-base.vercel.app/api/share/frame?fid=${userState.fid}`;

    try {
        await sdk.actions.composeCast({
            text: text,
            embeds: [embedUrl]
        });
        setShowWinnerModal(false);
    } catch (e) {
        console.error("Winner share failed", e);
    }
  };

  const handleTabChange = (newTab: Tab) => {
    if (newTab === activeTab) return;
    
    // Determine direction
    // Game = 0, Leaderboard = 1, Tasks = 2
    const tabOrder = [Tab.GAME, Tab.LEADERBOARD, Tab.TASKS];
    const oldIndex = tabOrder.indexOf(activeTab);
    const newIndex = tabOrder.indexOf(newTab);
    
    setDirection(newIndex > oldIndex ? 1 : -1);
    setActiveTab(newTab);
  };

  const handleTaskUpdate = () => {
    if (userState.fid) {
      checkTasks(userState.fid);
    }
  };

  // Use Math.round to handle floating point precision
  const neynarPowerCalc = Math.round(100 * (userState.neynarScore || 0));
  const streakPowerCalc = Math.min(userState.streak, 30);
  const teamPowerCalc = userState.teamScore || 0;

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
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] transition-colors duration-1000 bg-sky-500/10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] transition-colors duration-1000 bg-emerald-500/10" />
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
                onClick={() => setShowMenu(true)}
                className="p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white transition-colors border border-slate-700/50"
            >
                <Menu size={20} />
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow relative z-10 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {activeTab === Tab.GAME ? (
            <motion.div
              key="game"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex-grow flex flex-col items-center justify-center pb-24 overflow-y-auto"
            >
              <Stats 
                userState={userState} 
                canClick={canClick} 
                rank={rank}
                clickPower={clickPower}
              />
              
              <div className="relative">
                {/* HUD Indicators */}
                <div className="absolute -top-4 -left-20 sm:-left-32 w-10 h-10 rounded-full bg-slate-800/40 border border-slate-700/50 backdrop-blur-md flex items-center justify-center z-20 shadow-lg">
                    <span className="text-[24px] font-black text-slate-300">T1</span>
                </div>
                <div className="absolute -top-4 -right-20 sm:-right-32 w-10 h-10 rounded-full bg-slate-800/40 border border-slate-700/50 backdrop-blur-md flex items-center justify-center z-20 shadow-lg overflow-hidden">
                    <img src="https://raw.githubusercontent.com/StanleyMorgan/graphics/main/coin/eth.png" alt="ETH" className="w-8 h-8" />
                </div>

                {/* Overlay for processing state */}
                {(isProcessing || isTxPending) && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl">
                        <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-2" />
                        <span className="text-sm font-bold text-sky-100">Confirming...</span>
                    </div>
                )}
                
                <Cube 
                  canClick={canClick} 
                  onClick={handleCubeClick} 
                  streamTarget={isContractTarget || userState.streamTarget} 
                />
                
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
          ) : activeTab === Tab.LEADERBOARD ? (
            <motion.div
              key="leaderboard"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex-grow h-full overflow-hidden"
            >
              <Leaderboard 
                currentUser={userState} 
                currentRank={rank}
                currentTargetAddress={contractTargetAddress}
                currentTargetCollectedFee={contractCollectedFee}
                onPlayerSelect={setSelectedPlayer} 
              />
            </motion.div>
          ) : (
             <motion.div
              key="tasks"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex-grow h-full overflow-hidden"
            >
              <Tasks onTaskUpdate={handleTaskUpdate} />
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

      <WinnerModal 
          isOpen={showWinnerModal}
          onClose={() => setShowWinnerModal(false)}
          onShare={handleWinnerShare}
          rewards={userState.actualRewards}
          historicalRewards={userState.rewards}
      />

      <MenuDropdown
          isOpen={showMenu}
          onClose={() => setShowMenu(false)}
          neynarPower={neynarPowerCalc}
          neynarPowerChange={userState.neynarPowerChange}
          streakPower={streakPowerCalc}
          teamPower={teamPowerCalc}
          rewards={userState.actualRewards}
          teamMembers={userState.teamMembers}
      />
      
      <PlayerStatsModal 
        player={selectedPlayer} 
        onClose={() => setSelectedPlayer(null)}
        onSelectPlayer={setSelectedPlayer}
      />

      {/* Navigation - Hidden when Player Stats Modal is open to prevent overlap */}
      {!selectedPlayer && (
        <Navigation 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
          hasNewTask={hasNewTask}
        />
      )}
    </div>
  );
};

export default App;
