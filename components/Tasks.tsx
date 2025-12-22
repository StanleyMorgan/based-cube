
import React, { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle2, Zap, Loader2, ArrowRight, Share, Check, Heart, Repeat } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { api } from '../services/storage';

const STMORGAN_FID = 491961; // @stmorgan FID
const TARGET_CAST_HASH = '0x547fce304a0674d2918e1172f603b98e58330925';

// Define the 4 states
type TaskStatus = 'start' | 'verify' | 'claim' | 'claimed';

const Tasks = () => {
  const [taskStates, setTaskStates] = useState<Record<string, TaskStatus>>({});
  const [loading, setLoading] = useState(true);
  const [processingTask, setProcessingTask] = useState<string | null>(null);
  
  const [fid, setFid] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
        try {
            const context = await sdk.context;
            if (context.user?.fid) {
                setFid(context.user.fid);
                
                // Get completed tasks from DB
                const ids = await api.getCompletedTasks(context.user.fid);
                
                // Initialize states
                const initialStates: Record<string, TaskStatus> = {
                    'like_recast': ids.includes('like_recast') ? 'claimed' : 'start',
                    'follow_stmorgan': ids.includes('follow_stmorgan') ? 'claimed' : 'start',
                    'invite_friend': ids.includes('invite_friend') ? 'claimed' : 'start',
                };
                setTaskStates(initialStates);
                
                // Get current score for share embed
                const user = await api.syncUser(context.user.fid, context.user.username || 'User');
                setScore(user.score);
            }
        } catch (e) {
            console.error("Failed to load tasks", e);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  // -- Action Handlers --

  const handleStart = async (taskId: string) => {
      if (taskId === 'like_recast') {
          try {
              await sdk.actions.viewCast({ hash: TARGET_CAST_HASH });
              setTaskStates(prev => ({ ...prev, [taskId]: 'verify' }));
          } catch (e) {
              console.error("Failed to open cast", e);
          }
      }
      else if (taskId === 'follow_stmorgan') {
          try {
              await sdk.actions.viewProfile({ fid: STMORGAN_FID });
              setTaskStates(prev => ({ ...prev, [taskId]: 'verify' }));
          } catch (e) {
              console.error("Failed to open profile", e);
          }
      } 
      else if (taskId === 'invite_friend') {
          const text = `Join me on Tesseract! 🧊\nPlay daily and climb the leaderboard.`;
          const embedUrl = `https://tesseract-base.vercel.app/api/share/frame?fid=${fid}&score=${score}`;
          try {
             await sdk.actions.composeCast({
                text: text,
                embeds: [embedUrl]
             });
             setTaskStates(prev => ({ ...prev, [taskId]: 'verify' }));
          } catch (e) {
             console.error("Invite action failed", e);
             setTaskStates(prev => ({ ...prev, [taskId]: 'verify' }));
          }
      }
  };

  const handleVerify = async (taskId: string) => {
      if (!fid) return;
      setProcessingTask(taskId);
      
      try {
          const verified = await api.verifyTask(fid, taskId);
          if (verified) {
              setTaskStates(prev => ({ ...prev, [taskId]: 'claim' }));
          } else {
              if (taskId === 'invite_friend') alert("No referrals found yet. Make sure someone joined via your link!");
              else if (taskId === 'like_recast') alert("Please Like and Recast the cast before verifying!");
              else alert("Action not verified yet. Please try again.");
          }
      } catch (e) {
          console.error("Verify failed", e);
      } finally {
          setProcessingTask(null);
      }
  };

  const handleClaim = async (taskId: string) => {
      if (!fid) return;
      setProcessingTask(taskId);

      try {
          const result = await api.claimTask(fid, taskId);
          if (result.success) {
              setTaskStates(prev => ({ ...prev, [taskId]: 'claimed' }));
          } else {
              alert(result.error || "Failed to claim task");
          }
      } catch (e) {
          console.error("Claim failed", e);
      } finally {
          setProcessingTask(null);
      }
  };

  // Render button based on state
  const renderButton = (taskId: string) => {
      const status = taskStates[taskId] || 'start';
      const isProcessing = processingTask === taskId;

      if (status === 'claimed') {
          return (
            <button disabled className="px-3 py-1.5 rounded-lg text-sm font-bold bg-transparent text-emerald-500 cursor-default border border-transparent flex items-center gap-1 whitespace-nowrap">
                <Check size={16} /> Done
            </button>
          );
      }

      if (status === 'claim') {
          return (
            <button 
                onClick={() => handleClaim(taskId)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 flex items-center gap-2 animate-pulse whitespace-nowrap"
            >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Claim'}
            </button>
          );
      }

      if (status === 'verify') {
          return (
            <button 
                onClick={() => handleVerify(taskId)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-600 text-white hover:bg-amber-500 shadow-lg shadow-amber-900/30 flex items-center gap-2 whitespace-nowrap"
            >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Verify'}
            </button>
          );
      }

      // Default: Start
      return (
        <button 
            onClick={() => handleStart(taskId)}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-900/30 flex items-center gap-2 whitespace-nowrap"
        >
            Start <ArrowRight size={16} />
        </button>
      );
  };

  if (loading) {
      return (
          <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin text-purple-400" />
          </div>
      );
  }

  return (
    <div className="w-full max-w-md mx-auto h-full overflow-y-auto pb-32 px-4">
      <div className="flex items-center gap-3 mb-6 mt-4">
        <ClipboardList className="w-8 h-8 text-purple-400" />
        <h2 className="text-2xl font-bold">Tasks</h2>
      </div>

      <div className="space-y-4">

        {/* Task 0: Like & Recast */}
        <div className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${taskStates['like_recast'] === 'claimed' ? 'bg-slate-800/20 border-slate-700/30 opacity-60' : 'bg-slate-800/40 border-slate-700/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]'}`}>
            <div className="flex items-center flex-grow min-w-0 mr-4">
                <div className={`flex-shrink-0 p-2 rounded-full mr-3 ${taskStates['like_recast'] === 'claimed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-400'}`}>
                    {taskStates['like_recast'] === 'claimed' ? <CheckCircle2 size={20} /> : <div className="flex -space-x-1"><Heart size={14} className="fill-current" /><Repeat size={14} /></div>}
                </div>

                <div className="min-w-0">
                    <div className="font-semibold text-slate-100 truncate">Like & Recast</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                            +50 <Zap size={10} />
                        </span>
                        <span>Hot Reward</span>
                    </div>
                </div>
            </div>

            <div className="flex-shrink-0">
                {renderButton('like_recast')}
            </div>
        </div>
        
        {/* Task 1: Follow */}
        <div className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${taskStates['follow_stmorgan'] === 'claimed' ? 'bg-slate-800/20 border-slate-700/30 opacity-60' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center flex-grow min-w-0 mr-4">
                <div className={`flex-shrink-0 p-2 rounded-full mr-3 ${taskStates['follow_stmorgan'] === 'claimed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                    {taskStates['follow_stmorgan'] === 'claimed' ? <CheckCircle2 size={20} /> : <ClipboardList size={20} />}
                </div>

                <div className="min-w-0">
                    <div className="font-semibold text-slate-100 truncate">Follow @stmorgan</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                            +10 <Zap size={10} />
                        </span>
                        <span>Reward</span>
                    </div>
                </div>
            </div>

            <div className="flex-shrink-0">
                {renderButton('follow_stmorgan')}
            </div>
        </div>

        {/* Task 2: Invite */}
        <div className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${taskStates['invite_friend'] === 'claimed' ? 'bg-slate-800/20 border-slate-700/30 opacity-60' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center flex-grow min-w-0 mr-4">
                <div className={`flex-shrink-0 p-2 rounded-full mr-3 ${taskStates['invite_friend'] === 'claimed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                    {taskStates['invite_friend'] === 'claimed' ? <CheckCircle2 size={20} /> : <ClipboardList size={20} />}
                </div>

                <div className="min-w-0">
                    <div className="font-semibold text-slate-100 truncate">Invite a Friend</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                            +10 <Zap size={10} />
                        </span>
                        <span>Reward</span>
                    </div>
                </div>
            </div>

             <div className="flex-shrink-0">
                {renderButton('invite_friend')}
            </div>
        </div>
        
        <div className="mt-8 text-center text-slate-500 text-xs p-4 border border-dashed border-slate-800 rounded-xl">
           Complete tasks to increase your total score.
        </div>
      </div>
    </div>
  );
};

export default Tasks;
