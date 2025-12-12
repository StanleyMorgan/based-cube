import React from 'react';
import { ClipboardList, CheckCircle2, Zap } from 'lucide-react';

const Tasks = () => {
  // Placeholder data
  const tasks = [
    { id: 1, title: 'Connect Wallet', reward: 100, completed: true },
    { id: 2, title: 'Follow /tesseract', reward: 500, completed: false },
    { id: 3, title: 'Like & Recast', reward: 200, completed: false },
    { id: 4, title: 'Invite a Friend', reward: 1000, completed: false },
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
            className={`w-full flex items-center p-4 rounded-xl border transition-all duration-200 ${
              task.completed
                ? 'bg-slate-800/20 border-slate-700/30 opacity-60'
                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'
            } backdrop-blur-sm`}
          >
            <div className={`p-2 rounded-full mr-3 ${task.completed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                {task.completed ? <CheckCircle2 size={20} /> : <ClipboardList size={20} />}
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
                disabled={task.completed}
                className={`ml-3 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    task.completed 
                    ? 'bg-transparent text-emerald-500 cursor-default'
                    : 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-900/30'
                }`}
            >
                {task.completed ? 'Done' : 'Start'}
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