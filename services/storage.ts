import { LeaderboardEntry, UserState } from '../types';

// Helper for date calculations on frontend
export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getTimeUntilNextClick = (lastClickDate: string | null): string => {
  if (!lastClickDate) return "00:00:00";
  
  const lastClick = new Date(lastClickDate);
  const now = new Date();
  
  // Calculate next click time: last click + 24 hours
  const nextClick = new Date(lastClick.getTime() + 24 * 60 * 60 * 1000);
  
  const diff = nextClick.getTime() - now.getTime();
  
  // If time passed, show 00:00:00
  if (diff <= 0) return "00:00:00";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const canClickCube = (lastClickDate: string | null): boolean => {
  if (!lastClickDate) return true;
  
  const lastClick = new Date(lastClickDate);
  const now = new Date();
  const cooldown = 24 * 60 * 60 * 1000; // 24 hours in ms
  
  return (now.getTime() - lastClick.getTime()) >= cooldown;
};

export const getClickPower = (streak: number, neynarScore: number = 0, teamScore: number = 0): number => {
  // Logic: 100 * Neynar Score + Streak (max 30) + Team Score (0-3)
  const basePower = Math.floor(100 * neynarScore);
  const streakBonus = Math.min(streak, 30);
  return basePower + streakBonus + teamScore;
};

// --- API CLIENT ---

export const api = {
  syncUser: async (fid: number, username: string, pfpUrl?: string, primaryAddress?: string, referrerFid?: number): Promise<UserState & { rank: number }> => {
    const res = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fid, username, pfpUrl, primaryAddress, referrerFid }),
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
      neynarScore: data.neynar_score || 0,
      primaryAddress: data.primary_address,
      referrerFid: data.referrer_fid ? parseInt(data.referrer_fid) : undefined,
      referrerAddress: data.referrerAddress,
      teamScore: data.teamScore || 0
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
      neynarScore: data.neynar_score || 0,
      primaryAddress: data.primary_address,
      teamScore: data.teamScore || 0
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
      isCurrentUser: entry.fid == currentFid,
      streak: entry.streak || 0,
      neynarScore: entry.neynarScore || 0,
      teamScore: entry.teamScore || 0
    }));
  }
};