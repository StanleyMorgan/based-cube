import React, { useEffect, useState } from 'react';
import { LeaderboardEntry, UserState } from '../types';
import { api } from '../services/storage';
import { Trophy, Medal, User } from 'lucide-react';

interface LeaderboardProps {
  currentUser: UserState;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ currentUser }) => {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
        try {
            const entries = await api.getLeaderboard(currentUser.fid);
            setData(entries);
        } catch (e) {
            console.error("Failed to load leaderboard", e);
        } finally {
            setLoading(false);
        }
    };
    
    fetchLeaderboard();
  }, [currentUser.fid]);

  return (
    <div className="w-full max-w-md mx-auto h-full overflow-y-auto pb-20 px-4">
      <div className="flex items-center gap-3 mb-6 mt-4">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <h2 className="text-2xl font-bold">Top Players</h2>
      </div>

      {loading ? (
          <div className="flex justify-center py-10">
              <div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full"></div>
          </div>
      ) : (
        <div className="space-y-3">
            {data.map((entry) => (
            <div
                key={entry.id}
                className={`flex items-center p-4 rounded-xl border ${
                entry.isCurrentUser
                    ? 'bg-sky-900/30 border-sky-500/50'
                    : 'bg-slate-800/40 border-slate-700/50'
                } backdrop-blur-sm transition-transform hover:scale-[1.01]`}
            >
                <div className="flex-shrink-0 w-8 text-center font-bold text-lg">
                {entry.rank === 1 && <Medal className="w-6 h-6 text-yellow-400 mx-auto" />}
                {entry.rank === 2 && <Medal className="w-6 h-6 text-gray-300 mx-auto" />}
                {entry.rank === 3 && <Medal className="w-6 h-6 text-amber-700 mx-auto" />}
                {entry.rank > 3 && <span className="text-slate-500">#{entry.rank}</span>}
                </div>

                <div className="ml-3 flex-shrink-0">
                {entry.pfpUrl ? (
                    <img src={entry.pfpUrl} alt={entry.username} className="w-8 h-8 rounded-full border border-slate-600" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                        <User size={16} className="text-slate-400" />
                    </div>
                )}
                </div>

                <div className="ml-3 flex-grow">
                <div className="font-semibold text-slate-100 flex items-center gap-2">
                    {entry.username}
                    {entry.isCurrentUser && (
                    <span className="text-[10px] bg-sky-500 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">YOU</span>
                    )}
                </div>
                </div>

                <div className="text-right font-mono font-bold text-emerald-400">
                {entry.score.toLocaleString()}
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;