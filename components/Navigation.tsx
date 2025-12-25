
import React from 'react';
import { Tab } from '../types';
import { Box, BarChart3, ClipboardList } from 'lucide-react';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  hasNewTask?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, hasNewTask = false }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-full px-2 py-2 flex gap-2 shadow-2xl z-50">
      <button
        onClick={() => onTabChange(Tab.GAME)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${
          activeTab === Tab.GAME
            ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/50'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Box size={20} />
        <span className="font-medium hidden min-[380px]:inline">Main</span>
      </button>

      <button
        onClick={() => onTabChange(Tab.LEADERBOARD)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${
          activeTab === Tab.LEADERBOARD
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <BarChart3 size={20} />
        <span className="font-medium hidden min-[380px]:inline">Top</span>
      </button>

      <button
        onClick={() => onTabChange(Tab.TASKS)}
        className={`relative flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${
          activeTab === Tab.TASKS
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <ClipboardList size={20} />
        <span className="font-medium hidden min-[380px]:inline">Tasks</span>
        
        {/* Notification Badge */}
        {hasNewTask && activeTab !== Tab.TASKS && (
          <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#9334ea] rounded-full border border-slate-900" />
        )}
      </button>
    </div>
  );
};

export default Navigation;
