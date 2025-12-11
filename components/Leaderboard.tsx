import React, { useEffect, useState } from 'react';
import { LeaderboardEntry, UserState } from '../types';
import { api } from '../services/storage';
import { Trophy, Medal, User, Loader2 } from 'lucide-react';

interface LeaderboardProps {
  currentUser: UserState;
  onPlayerSelect: (player: LeaderboardEntry) => void;
}

// Internal reusable row component to keep code DRY
const PlayerRow = ({ entry, onClick }: { entry: LeaderboardEntry; onClick: (p: LeaderboardEntry) => void }) => {
  return (
    <button
      onClick={() => onClick(entry)}
      className={`w-full flex items-center p-4 rounded-xl border text-left transition-all duration-200 active:scale-[0.98] ${
        entry.isCurrentUser
          ? 'bg-sky-900/30 border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.15)]'
          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'
      } backdrop-blur-sm`}
    >
      <div className="flex-shrink-0 w-8 text-center font-bold text-lg">
        {entry.rank === 1 && <Medal className="w-6 h-6 text-yellow-400 mx-auto" />}
        {entry.rank === 2 && <Medal className="w-6 h-6 text-gray-300 mx-auto" />}
        {entry.rank === 3 && <Medal className="w-6 h-6 text-amber-700 mx-auto" />}
        {entry.rank > 3 && <span className="text-slate-500">#{entry.rank}</span>}
      </div>

      <div className="ml-3 flex-shrink-0">
        {entry.pfpUrl ? (
          <img src={entry.pfpUrl} alt={entry.username} className="w-10 h-10 rounded-full border border-slate-600" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
            <User size={20} className="text-slate-400" />
          </div>
        )}
      </div>

      <div className="ml-3 flex-grow min-w-0">
        <div className="font-semibold text-slate-100 flex items-center gap-2 truncate">
          {entry.username}
          {entry.isCurrentUser && (
            <span className="text-[10px] bg-sky-500 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wide flex-shrink-0">YOU</span>
          )}
        </div>
      </div>

      <div className="text-right font-mono font-bold text-emerald-400 flex-shrink-0 pl-2">
        {entry.score.toLocaleString()}
      </div>
    </button>
  );
};

const Leaderboard: React.FC<LeaderboardProps> = ({ currentUser, onPlayerSelect }) => {
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

  // Construct current user entry for the pinned view
  const pinnedEntry: LeaderboardEntry = {
      id: currentUser.fid?.toString() || '0',
      username: currentUser.username,
      score: currentUser.score,
      rank: currentUser.rank,
      pfpUrl: currentUser.pfpUrl,
      isCurrentUser: true,
      streak: currentUser.streak,
      neynarScore: currentUser.neynarScore || 0,
      teamScore: currentUser.teamScore || 0
  };

  const showPinnedUser = currentUser.rank > 4;

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col px-4">
      {/* Header - Static */}
      <div className="flex-shrink-0 flex items-center gap-3 mb-4 mt-4">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <h2 className="text-2xl font-bold">Top Players</h2>
      </div>

      {loading ? (
          <div className="flex-grow flex justify-center py-10">
              <Loader2 className="animate-spin w-8 h-8 text-sky-500" />
          </div>
      ) : (
        <>
            {/* Pinned User Section - Static if rank > 4 */}
            {showPinnedUser && (
                <div className="flex-shrink-0 mb-4">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2 pl-1">Your Rank</div>
                    <PlayerRow entry={pinnedEntry} onClick={onPlayerSelect} />
                    
                    {/* Visual Separator */}
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mt-4 opacity-50" />
                </div>
            )}

            {/* Scrollable List */}
            <div className="flex-grow overflow-y-auto pb-32 space-y-3 min-h-0">
                {data.map((entry) => (
                    <PlayerRow key={entry.id} entry={entry} onClick={onPlayerSelect} />
                ))}
            </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;