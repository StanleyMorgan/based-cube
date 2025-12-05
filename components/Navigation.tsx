import React from 'react';
import { Tab } from '../types';
import { Box, BarChart3 } from 'lucide-react';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-full px-2 py-2 flex gap-2 shadow-2xl z-50">
      <button
        onClick={() => onTabChange(Tab.GAME)}
        className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 ${
          activeTab === Tab.GAME
            ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/50'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Box size={20} />
        <span className="font-medium">Main</span>
      </button>

      <button
        onClick={() => onTabChange(Tab.LEADERBOARD)}
        className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 ${
          activeTab === Tab.LEADERBOARD
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <BarChart3 size={20} />
        <span className="font-medium">Top</span>
      </button>
    </div>
  );
};

export default Navigation;