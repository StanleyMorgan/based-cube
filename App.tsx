import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getUserState, canClickCube, performClick } from './services/storage';
import { Tab, UserState } from './types';
import Cube from './components/Cube';
import Leaderboard from './components/Leaderboard';
import Navigation from './components/Navigation';
import Stats from './components/Stats';
import { Info } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.GAME);
  const [userState, setUserState] = useState<UserState>(getUserState());
  const [canClick, setCanClick] = useState(false);
  const [showReward, setShowReward] = useState(false);

  // Initialize and check status
  useEffect(() => {
    setCanClick(canClickCube(userState.lastClickDate));
  }, [userState]);

  const handleCubeClick = () => {
    if (!canClick) return;

    const newState = performClick(userState);
    setUserState(newState);
    setCanClick(false);
    
    // Show reward animation
    setShowReward(true);
    setTimeout(() => setShowReward(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col relative overflow-hidden">
      
      {/* Background Ambient Light */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="p-6 flex justify-between items-center z-10">
        <h1 className="text-xl font-bold tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          DAILY CUBE
        </h1>
        <button className="p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white transition-colors">
            <Info size={20} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow relative z-10 flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === Tab.GAME ? (
            <motion.div
              key="game"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-grow flex flex-col items-center justify-center pb-24"
            >
              <Stats userState={userState} canClick={canClick} />
              
              <div className="relative">
                <Cube canClick={canClick} onClick={handleCubeClick} />
                
                {/* Floating Reward Animation */}
                <AnimatePresence>
                  {showReward && (
                    <motion.div
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -100, scale: 1.5 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
                    >
                      <div className="text-4xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                        +100
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="mt-12 text-center px-6">
                <p className="text-slate-500 text-sm">
                  {canClick 
                    ? "Tap the cube to claim your daily reward!" 
                    : "Come back tomorrow for a new reward."}
                </p>
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