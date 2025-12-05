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

export const getClickPower = (streak: number, neynarScore: number = 0): number => {
  // Logic: 100 * Neynar Score + Streak (max 30)
  // neynarScore is typically 0.0 to 1.0 (e.g. 0.95)
  // If neynarScore is not available (0), base power is 0.
  const basePower = Math.floor(100 * neynarScore);
  const streakBonus = Math.min(streak, 30);
  return basePower + streakBonus;
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
      rank: parseInt(data.rank),
      neynarScore: data.neynar_score || 0
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
      rank: parseInt(data.rank),
      neynarScore: data.neynar_score || 0
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