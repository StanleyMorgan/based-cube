import { LeaderboardEntry, UserState } from '../types';

// Helper for date calculations on frontend
export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getTimeUntilNextClick = (): string => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diff = tomorrow.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const canClickCube = (lastClickDate: string | null): boolean => {
  if (!lastClickDate) return true;
  // Convert DB date string to local YYYY-MM-DD for comparison
  const dbDate = new Date(lastClickDate).toISOString().split('T')[0];
  const today = getTodayString();
  return dbDate !== today;
};

export const getClickPower = (streak: number): number => {
  // Logic matches server: Base 100 + 10 per streak day (minus the first one usually, but let's keep visual simple)
  // Server uses: 100 + ((newStreak - 1) * 10)
  // Visual estimation:
  return 100 + ((streak > 0 ? streak - 1 : 0) * 10);
};

// --- API CLIENT ---

export const api = {
  syncUser: async (fid: number, username: string, pfpUrl?: string): Promise<UserState & { rank: number }> => {
    const res = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fid, username, pfpUrl }),
    });
    
    if (!res.ok) throw new Error('Failed to sync user');
    
    const data = await res.json();
    return {
      fid: parseInt(data.fid),
      username: data.username,
      score: data.score,
      streak: data.streak,
      lastClickDate: data.last_click_date,
      pfpUrl: data.pfp_url,
      rank: parseInt(data.rank)
    };
  },

  performClick: async (fid: number): Promise<UserState & { rank: number }> => {
    const res = await fetch('/api/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fid }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to click');
    }

    const data = await res.json();
    return {
      fid: parseInt(data.fid),
      username: data.username,
      score: data.score,
      streak: data.streak,
      lastClickDate: data.last_click_date,
      pfpUrl: data.pfp_url,
      rank: parseInt(data.rank)
    };
  },

  getLeaderboard: async (currentFid?: number): Promise<LeaderboardEntry[]> => {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) return [];
    
    const data: any[] = await res.json();
    
    return data.map((entry) => ({
      id: entry.id,
      username: entry.username,
      score: entry.score,
      rank: entry.rank,
      pfpUrl: entry.pfpUrl,
      isCurrentUser: entry.fid == currentFid
    }));
  }
};
