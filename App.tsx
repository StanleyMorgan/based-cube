import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sdk } from '@farcaster/miniapp-sdk';
import { api, canClickCube, getClickPower } from './services/storage';
import { Tab, UserState } from './types';
import Cube from './components/Cube';
import Leaderboard from './components/Leaderboard';
import Navigation from './components/Navigation';
import Stats from './components/Stats';
import { Info, ArrowUp } from 'lucide-react';

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
  
  // Stats State
  const [rank, setRank] = useState(0);
  const [clickPower, setClickPower] = useState(0);

  // Animation States
  const [showReward, setShowReward] = useState(false);
  const [showRankUp, setShowRankUp] = useState<{show: boolean, old: number, new: number} | null>(null);

  // Initialize Farcaster SDK and Sync User with DB
  useEffect(() => {
    const initApp = async () => {
        try {
            const context = await sdk.context;
            
            // Default user data if running outside Farcaster (e.g. dev)
            // In prod, context.user should exist
            const fid = context.user?.fid || 1001; // Fallback for dev testing
            const username = context.user?.displayName || context.user?.username || 'Player';
            const pfpUrl = context.user?.pfpUrl;

            // Sync with DB
            const syncedUser = await api.syncUser(fid, username, pfpUrl);
            
            setUserState(syncedUser);
            setRank(syncedUser.rank);
            
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

    try {
        const oldRank = rank;
        
        // Call API
        const newState = await api.performClick(userState.fid);
        
        setUserState(newState);
        setRank(newState.rank);
        setCanClick(false);
        
        // Show reward animation
        setShowReward(true);
        setTimeout(() => setShowReward(false), 2000);

        // Show Rank Up animation if rank improved (lower number is better)
        if (newState.rank < oldRank) {
            setShowRankUp({ show: true, old: oldRank, new: newState.rank });
            setTimeout(() => setShowRankUp(null), 3000);
        }
    } catch (e) {
        console.error("Click failed", e);
        // Optional: Show error toast
    }
  };

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
              <div className="animate-pulse">Loading Based Cube...</div>
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
          BASED CUBE
        </h1>
        <button className="p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white transition-colors">
            <Info size={20} />
        </button>
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

      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;