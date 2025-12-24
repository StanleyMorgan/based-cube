
import React, { useEffect, useState, useMemo } from 'react';
// Added Share to the lucide-react import list
import { ClipboardList, CheckCircle2, Zap, Loader2, ArrowRight, Check, Heart, Repeat, ExternalLink, UserPlus, Share } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { api } from '../services/storage';
import { Task } from '../types';

// Define the local status which includes the ephemeral 'verify' and 'claim' steps
type LocalTaskStatus = 'start' | 'verify' | 'claim' | 'claimed';

interface DynamicTask extends Task {
    localStatus: LocalTaskStatus;
}

const Tasks = () => {
  const [tasks, setTasks] = useState<DynamicTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingTask, setProcessingTask] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());
  
  const [fid, setFid] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);

  // Update current time for cooldown calculations
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
        try {
            const context = await sdk.context;
            if (context.user?.fid) {
                const userFid = context.user.fid;
                setFid(userFid);
                
                // Get tasks from DB with their completion status
                const dbTasks = await api.getTasks(userFid);
                
                // Map to dynamic tasks
                const mappedTasks: DynamicTask[] = dbTasks.map(t => ({
                    ...t,
                    localStatus: t.status as LocalTaskStatus // status returned from API is 'claimed' or 'start'
                }));

                setTasks(mappedTasks);
                
                // Get current user details for share context
                const user = await api.syncUser(userFid, context.user.username || 'User');
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

  const updateTaskStatus = (id: string, newStatus: LocalTaskStatus) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, localStatus: newStatus } : t));
  };

  const handleStart = async (task: DynamicTask) => {
      if (task.type === 'NEYNAR_CAST') {
          try {
              await sdk.actions.viewCast({ hash: task.target_id });
              updateTaskStatus(task.id, 'verify');
          } catch (e) {
              console.error("Failed to open cast", e);
          }
      }
      else if (task.type === 'NEYNAR_FOLLOW') {
          try {
              const targetFid = parseInt(task.target_id);
              if (!isNaN(targetFid)) {
                  await sdk.actions.viewProfile({ fid: targetFid });
                  updateTaskStatus(task.id, 'verify');
              }
          } catch (e) {
              console.error("Failed to open profile", e);
          }
      } 
      else if (task.type === 'REFERRAL') {
          const text = `Join me on Tesseract! 🧊\nPlay daily and climb the leaderboard.`;
          const embedUrl = `https://tesseract-base.vercel.app/api/share/frame?fid=${fid}&score=${score}`;
          try {
             await sdk.actions.composeCast({
                text: text,
                embeds: [embedUrl]
             });
             updateTaskStatus(task.id, 'verify');
          } catch (e) {
             console.error("Invite action failed", e);
             updateTaskStatus(task.id, 'verify');
          }
      }
      else if (task.type === 'LINK') {
          try {
              await sdk.actions.openUrl(task.target_id);
              updateTaskStatus(task.id, 'claim');
          } catch (e) {
              console.error("Failed to open URL", e);
          }
      }
  };

  const handleVerify = async (taskId: string) => {
      if (!fid) return;
      
      // Cooldown check
      const lastAttempt = cooldowns[taskId] || 0;
      if (Date.now() - lastAttempt < 30000) return;

      setProcessingTask(taskId);
      
      try {
          const verified = await api.verifyTask(fid, taskId);
          if (verified) {
              updateTaskStatus(taskId, 'claim');
          } else {
              // Set cooldown on failure
              setCooldowns(prev => ({ ...prev, [taskId]: Date.now() }));
              alert("Verification failed. Please ensure you completed the action and try again in 30 seconds.");
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
              updateTaskStatus(taskId, 'claimed');
          } else {
              alert(result.error || "Failed to claim task");
          }
      } catch (e) {
          console.error("Claim failed", e);
      } finally {
          setProcessingTask(null);
      }
  };

  const getTaskIcon = (type: string, status: string) => {
      if (status === 'claimed') return <CheckCircle2 size={20} />;
      
      switch (type) {
          case 'NEYNAR_CAST': return <Repeat size={20} />;
          case 'NEYNAR_FOLLOW': return <UserPlus size={20} />;
          case 'REFERRAL': return <Share size={20} />;
          case 'LINK': return <ExternalLink size={20} />;
          default: return <ClipboardList size={20} />;
      }
  };

  // Render button based on status
  const renderButton = (task: DynamicTask) => {
      const status = task.localStatus;
      const isProcessing = processingTask === task.id;

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
                onClick={() => handleClaim(task.id)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 flex items-center gap-2 animate-pulse whitespace-nowrap"
            >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Claim'}
            </button>
          );
      }

      if (status === 'verify') {
          const lastAttempt = cooldowns[task.id] || 0;
          const secondsLeft = Math.ceil((30000 - (now - lastAttempt)) / 1000);
          const inCooldown = secondsLeft > 0;

          return (
            <button 
                onClick={() => inCooldown ? null : handleVerify(task.id)}
                disabled={isProcessing || inCooldown}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                    inCooldown 
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600' 
                    : 'bg-amber-600 text-white hover:bg-amber-500 shadow-lg shadow-amber-900/30'
                }`}
            >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : (inCooldown ? `Wait ${secondsLeft}s` : 'Verify')}
            </button>
          );
      }

      // Default: Start
      return (
        <button 
            onClick={() => handleStart(task)}
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
        {tasks.map((task) => (
            <div 
                key={task.id}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${task.localStatus === 'claimed' ? 'bg-slate-800/20 border-slate-700/30 opacity-60' : 'bg-slate-800/40 border-slate-700/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]'}`}
            >
                <div className="flex items-center flex-grow min-w-0 mr-4">
                    <div className={`flex-shrink-0 p-2 rounded-full mr-3 ${task.localStatus === 'claimed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                        {getTaskIcon(task.type, task.localStatus)}
                    </div>

                    <div className="min-w-0">
                        <div className="font-semibold text-slate-100 truncate">{task.title}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                                +{task.reward} <Zap size={10} />
                            </span>
                            <span>Reward</span>
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0">
                    {renderButton(task)}
                </div>
            </div>
        ))}
        
        {tasks.length === 0 && (
            <div className="text-center text-slate-500 text-sm py-12">
                No active tasks available right now.
            </div>
        )}
        
        <div className="mt-8 text-center text-slate-500 text-xs p-4 border border-dashed border-slate-800 rounded-xl">
           Complete tasks to increase your total score. New tasks are added via the cosmic gateway.
        </div>
      </div>
    </div>
  );
};

export default Tasks;
