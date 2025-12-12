import React from 'react';
import { ClipboardList, CheckCircle2, Zap } from 'lucide-react';

const Tasks = () => {
  // Placeholder data with updated rewards
  const tasks = [
    { id: 2, title: 'Follow /tesseract', reward: 10 },
    { id: 3, title: 'Like & Recast', reward: 10 },
    { id: 4, title: 'Invite a Friend', reward: 10 },
  ];

  return (
    <div className="w-full max-w-md mx-auto h-full overflow-y-auto pb-32 px-4">
      <div className="flex items-center gap-3 mb-6 mt-4">
        <ClipboardList className="w-8 h-8 text-purple-400" />
        <h2 className="text-2xl font-bold">Tasks</h2>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="w-full flex items-center p-4 rounded-xl border transition-all duration-200 bg-slate-800/40 border-slate-700/50 backdrop-blur-sm opacity-80"
          >
            <div className="p-2 rounded-full mr-3 bg-slate-700 text-slate-400">
                <ClipboardList size={20} />
            </div>

            <div className="flex-grow min-w-0">
                <div className="font-semibold text-slate-100 truncate">
                    {task.title}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                    <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                        +{task.reward} <Zap size={10} />
                    </span>
                    <span>Reward</span>
                </div>
            </div>

            <button 
                disabled={true}
                className="ml-3 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors bg-slate-700/50 text-slate-500 cursor-not-allowed border border-slate-600/30"
            >
                Start
            </button>
          </div>
        ))}
        
        <div className="mt-8 text-center text-slate-500 text-sm p-4 border border-dashed border-slate-800 rounded-xl">
            More tasks coming soon...
        </div>
      </div>
    </div>
  );
};

export default Tasks;