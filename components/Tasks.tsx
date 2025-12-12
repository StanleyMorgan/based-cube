import React, { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle2, Zap, Loader2, ArrowRight, Share } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { api } from '../services/storage';

const STMORGAN_FID = 491961; // @stmorgan FID

const Tasks = () => {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [readyToClaim, setReadyToClaim] = useState<string | null>(null);
  const [fid, setFid] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0); // To force refresh URL or just consistency

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
        try {
            const context = await sdk.context;
            if (context.user?.fid) {
                setFid(context.user.fid);
                const ids = await api.getCompletedTasks(context.user.fid);
                setCompletedIds(ids);
                
                // Get current score for share embed if needed (optional optimization)
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

  const handleFollow = async () => {
    try {
        await sdk.actions.viewProfile({ fid: STMORGAN_FID });
        // After returning from profile, we allow them to claim
        setReadyToClaim('follow_stmorgan');
    } catch (e) {
        console.error("Failed to open profile", e);
    }
  };

  const handleInviteAction = async () => {
    if (!fid) return;
    
    const text = `Join me on Tesseract! 🧊\nPlay daily and climb the leaderboard.`;
    const embedUrl = `https://tesseract-base.vercel.app/api/share/frame?fid=${fid}&score=${score}`;

    try {
        await sdk.actions.composeCast({
            text: text,
            embeds: [embedUrl]
        });
        // Enable claim button after action
        setReadyToClaim('invite_friend');
    } catch (e) {
        console.error("Invite action failed", e);
        // Allow claim attempt even if action was cancelled/failed (in case they did it before)
        setReadyToClaim('invite_friend');
    }
  };

  const handleClaim = async (taskId: string) => {
    if (!fid) return;
    setClaiming(taskId);
    
    try {
        const result = await api.claimTask(fid, taskId);
        if (result.success) {
            setCompletedIds(prev => [...prev, taskId]);
            setReadyToClaim(null);
            alert(`Task completed! +10 Points`);
        } else {
            alert(result.error || "Failed to claim task");
        }
    } catch (e) {
        console.error("Error claiming task", e);
        alert("Something went wrong");
    } finally {
        setClaiming(null);
    }
  };

  const isCompleted = (id: string) => completedIds.includes(id);

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
        
        {/* Task 1: Follow */}
        <div className={`w-full flex flex-col p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${isCompleted('follow_stmorgan') ? 'bg-slate-800/20 border-slate-700/30 opacity-60' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center w-full">
                <div className={`p-2 rounded-full mr-3 ${isCompleted('follow_stmorgan') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                    {isCompleted('follow_stmorgan') ? <CheckCircle2 size={20} /> : <ClipboardList size={20} />}
                </div>

                <div className="flex-grow min-w-0">
                    <div className="font-semibold text-slate-100 truncate">Follow @stmorgan</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                            +10 <Zap size={10} />
                        </span>
                        <span>Reward</span>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex justify-end">
                {isCompleted('follow_stmorgan') ? (
                    <button disabled className="px-4 py-1.5 rounded-lg text-sm font-bold bg-transparent text-emerald-500 cursor-default border border-transparent">
                        Done
                    </button>
                ) : readyToClaim === 'follow_stmorgan' ? (
                     <button 
                        onClick={() => handleClaim('follow_stmorgan')}
                        disabled={claiming === 'follow_stmorgan'}
                        className="px-6 py-2 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 flex items-center gap-2"
                    >
                        {claiming === 'follow_stmorgan' ? <Loader2 size={16} className="animate-spin" /> : 'Claim Reward'}
                    </button>
                ) : (
                    <button 
                        onClick={handleFollow}
                        className="px-6 py-2 rounded-lg text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-900/30 flex items-center gap-2"
                    >
                        Follow <ArrowRight size={16} />
                    </button>
                )}
            </div>
        </div>

        {/* Task 2: Invite */}
        <div className={`w-full flex flex-col p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${isCompleted('invite_friend') ? 'bg-slate-800/20 border-slate-700/30 opacity-60' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center w-full">
                <div className={`p-2 rounded-full mr-3 ${isCompleted('invite_friend') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                    {isCompleted('invite_friend') ? <CheckCircle2 size={20} /> : <ClipboardList size={20} />}
                </div>

                <div className="flex-grow min-w-0">
                    <div className="font-semibold text-slate-100 truncate">Invite a Friend</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                            +10 <Zap size={10} />
                        </span>
                        <span>Reward</span>
                    </div>
                </div>
            </div>

             <div className="mt-3 flex justify-end">
                {isCompleted('invite_friend') ? (
                    <button disabled className="px-4 py-1.5 rounded-lg text-sm font-bold bg-transparent text-emerald-500 cursor-default">
                        Done
                    </button>
                ) : readyToClaim === 'invite_friend' ? (
                     <button 
                        onClick={() => handleClaim('invite_friend')}
                        disabled={claiming === 'invite_friend'}
                        className="px-6 py-2 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 flex items-center gap-2"
                    >
                         {claiming === 'invite_friend' ? <Loader2 size={16} className="animate-spin" /> : 'Claim Reward'}
                    </button>
                ) : (
                    <button 
                        onClick={handleInviteAction}
                        className="px-6 py-2 rounded-lg text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-900/30 flex items-center gap-2"
                    >
                         Invite <Share size={16} />
                    </button>
                )}
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