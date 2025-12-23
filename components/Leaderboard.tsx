
import React, { useEffect, useState, useRef } from 'react';
import { LeaderboardEntry, UserState } from '../types';
import { api } from '../services/storage';
import { Trophy, Medal, User, Loader2, Flame } from 'lucide-react';

interface LeaderboardProps {
  currentUser: UserState;
  currentRank: number;
  currentTargetAddress?: string;
  onPlayerSelect: (player: LeaderboardEntry) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ currentUser, currentRank, currentTargetAddress, onPlayerSelect }) => {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Ref for the intersection observer target
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchLeaderboard = async (pageNum: number, isInitial: boolean = false) => {
    try {
        if (isInitial) setLoading(true);
        else setLoadingMore(true);

        const entries = await api.getLeaderboard(currentUser.fid, pageNum);
        
        // If we got fewer than 20 entries, we've reached the end
        if (entries.length < 20) {
            setHasMore(false);
        }

        if (isInitial) {
            // Process logic for current user visibility ONLY on the first page
            const processedEntries = [...entries];
            const userIndex = processedEntries.findIndex(e => e.isCurrentUser);

            if (userIndex !== -1) {
                // User is in the fetched list
                const userEntry = processedEntries[userIndex];
                // Move to top if rank > 3 (so they see themselves pinned if not on podium)
                // BUT only if we are on page 1 and they are visible there
                if (userEntry.rank > 3) {
                    processedEntries.splice(userIndex, 1);
                    processedEntries.unshift(userEntry);
                }
            } else if (currentRank > 0) { // If user has a rank
                // User is not in this fetched list.
                // If it's page 1, check if we should show them pinned at top
                
                // Construct entry from currentUser state and prepend
                const userEntry: LeaderboardEntry = {
                    id: currentUser.fid?.toString() || 'user',
                    username: currentUser.username,
                    score: currentUser.score,
                    rewards: currentUser.rewards,
                    rank: currentRank,
                    pfpUrl: currentUser.pfpUrl,
                    isCurrentUser: true,
                    streak: currentUser.streak,
                    neynarScore: currentUser.neynarScore || 0,
                    teamScore: currentUser.teamScore || 0,
                    primaryAddress: currentUser.primaryAddress
                };
                processedEntries.unshift(userEntry);
            }
            setData(processedEntries);
        } else {
            // Append new entries, filtering out any potential duplicates (e.g. pinned user from page 1 appearing naturally on page X)
            setData(prev => {
                // Create a Set of existing IDs to prevent duplicates
                const existingIds = new Set(prev.map(e => e.id));
                const uniqueNewEntries = entries.filter(e => !existingIds.has(e.id));
                return [...prev, ...uniqueNewEntries];
            });
        }
    } catch (e) {
        console.error("Failed to load leaderboard", e);
    } finally {
        setLoading(false);
        setLoadingMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchLeaderboard(1, true);
  }, [currentUser.fid, currentRank]); // Reload if user identity changes

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage((prevPage) => {
            const nextPage = prevPage + 1;
            fetchLeaderboard(nextPage, false);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 } // Trigger when 10% of the target is visible
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadingMore]);

  return (
    <div className="w-full max-w-md mx-auto h-full overflow-y-auto pb-32 px-4 scroll-smooth">
      <div className="flex items-center gap-3 mb-6 mt-4">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <h2 className="text-2xl font-bold">Top Players</h2>
      </div>

      {loading ? (
          <div className="flex justify-center py-10">
              <Loader2 className="animate-spin w-8 h-8 text-sky-500" />
          </div>
      ) : (
        <div className="space-y-3">
            {data.map((entry) => {
                const isTarget = currentTargetAddress && entry.primaryAddress && 
                               currentTargetAddress.toLowerCase() === entry.primaryAddress.toLowerCase();
                               
                return (
                    <button
                        key={`${entry.id}-${entry.rank}`} // Unique key
                        onClick={() => onPlayerSelect(entry)}
                        className={`w-full flex items-center p-4 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                        entry.isCurrentUser
                            ? 'bg-sky-900/30 border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.15)] sticky top-0 z-10 backdrop-blur-md mb-2' 
                            : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'
                        } ${isTarget ? 'ring-2 ring-yellow-400/50 shadow-[0_0_10px_rgba(250,204,21,0.2)]' : ''}`}
                    >
                        <div className="flex-shrink-0 w-8 text-center font-bold text-lg">
                        {entry.rank === 1 && <Medal className="w-6 h-6 text-yellow-400 mx-auto" />}
                        {entry.rank === 2 && <Medal className="w-6 h-6 text-gray-300 mx-auto" />}
                        {entry.rank === 3 && <Medal className="w-6 h-6 text-amber-700 mx-auto" />}
                        {entry.rank > 3 && <span className="text-slate-500">#{entry.rank}</span>}
                        </div>

                        <div className="ml-3 flex-shrink-0">
                        {entry.pfpUrl ? (
                            <img 
                                src={entry.pfpUrl} 
                                alt={entry.username} 
                                className="w-10 h-10 rounded-full border border-slate-600" 
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                                <User size={20} className="text-slate-400" />
                            </div>
                        )}
                        </div>

                        <div className="ml-3 flex-grow min-w-0">
                            <div className={`font-semibold flex items-center gap-2 truncate ${isTarget ? 'animate-shimmer font-black text-lg' : 'text-slate-100'}`}>
                                {entry.username}
                                {entry.isCurrentUser && (
                                    <span className="text-[10px] bg-sky-500 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wide flex-shrink-0">YOU</span>
                                )}
                            </div>
                        </div>

                        <div className="text-right font-mono font-bold text-emerald-400 flex-shrink-0 pl-2 flex items-center justify-end gap-1.5">
                            {entry.streak > 6 && (
                                <Flame size={14} className="text-orange-500 fill-orange-500 animate-pulse" />
                            )}
                            {entry.score.toLocaleString()}
                        </div>
                    </button>
                );
            })}

            {/* Intersection Observer Target */}
            <div ref={observerTarget} className="h-4 w-full flex justify-center items-center py-4">
                {loadingMore && <Loader2 className="animate-spin w-6 h-6 text-sky-500/50" />}
            </div>
            
            {!hasMore && data.length > 20 && (
                <div className="text-center text-slate-500 text-sm py-4 pb-8">
                    End of Leaderboard
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
