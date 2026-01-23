
import { LeaderboardEntry, UserState, TeamMember, HistoryEntry, Task, LeaderboardSort } from '../types';

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

export const canClickCube = (lastClickDate: string | null, fid?: number): boolean => {
  if (!lastClickDate) return true;
  
  const lastClick = new Date(lastClickDate);
  const now = new Date();
  const cooldown = 24 * 60 * 60 * 1000; // 24 hours in ms
  
  return (now.getTime() - lastClick.getTime()) >= cooldown;
};

export const getClickPower = (streak: number, neynarScore: number = 0, teamScore: number = 0): number => {
  // Logic: 100 * Neynar Score + Streak (max 30) + Team Score (0-3)
  // Use Math.round to handle floating point precision (e.g. 0.57 * 100 = 56.999...)
  const basePower = Math.round(100 * neynarScore);
  const streakBonus = Math.min(streak, 30);
  return basePower + streakBonus + teamScore;
};

// --- API CLIENT ---

export const api = {
  getLatestSyncedDay: async (version: number = 1): Promise<number> => {
    const res = await fetch(`/api/history?version=${version}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.lastDay || 0;
  },

  syncHistory: async (data: HistoryEntry, version: number = 1): Promise<boolean> => {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, version }),
    });
    return res.ok;
  },

  syncRewards: async (targetAddress: string, collectedFeeWei: string): Promise<boolean> => {
    const res = await fetch('/api/sync-rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetAddress, collectedFeeWei }),
    });
    return res.ok;
  },

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
      rewards: parseFloat(data.rewards || 0),
      actualRewards: parseFloat(data.actualRewards || 0),
      streak: data.streak,
      lastClickDate: data.last_click_date,
      pfpUrl: data.pfp_url,
      rank: parseInt(data.rank),
      neynarScore: data.neynar_score || 0,
      neynarPowerChange: data.neynarPowerChange || 0,
      primaryAddress: data.primary_address,
      referrerFid: data.referrer_fid ? parseInt(data.referrer_fid) : undefined,
      referrerAddress: data.referrerAddress,
      teamScore: data.teamScore || 0,
      teamMembers: data.teamMembers || [],
      contractAddress: data.contractAddress,
      version: data.version,
      streamTarget: !!data.stream_target,
      streamPercent: data.streamPercent || 0,
      unitPrice: data.unitPrice || 0
    };
  },

  getSign: async (fid: number, address: string): Promise<{ points: number; day: number; signature: string }> => {
    const res = await fetch('/api/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, address }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to get signature');
    }
    return res.json();
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
      rewards: parseFloat(data.rewards || 0),
      actualRewards: parseFloat(data.actualRewards || 0),
      streak: data.streak,
      lastClickDate: data.last_click_date,
      pfpUrl: data.pfp_url,
      rank: parseInt(data.rank),
      neynarScore: data.neynar_score || 0,
      neynarPowerChange: data.neynarPowerChange || 0,
      primaryAddress: data.primary_address,
      teamScore: data.teamScore || 0,
      contractAddress: data.contractAddress,
      version: data.version,
      streamTarget: !!data.stream_target,
      streamPercent: data.streamPercent || 0,
      unitPrice: data.unitPrice || 0
    };
  },

  getLeaderboard: async (currentFid?: number, page: number = 1, sort: LeaderboardSort = 'score'): Promise<LeaderboardEntry[]> => {
    const res = await fetch(`/api/leaderboard?page=${page}&limit=20&sort=${sort}`);
    if (!res.ok) return [];
    
    const data: any[] = await res.json();
    
    return data.map((entry) => ({
      id: entry.id,
      username: entry.username,
      score: entry.score,
      rewards: parseFloat(entry.rewards || 0),
      actualRewards: parseFloat(entry.actualRewards || 0),
      rank: entry.rank,
      pfpUrl: entry.pfpUrl,
      isCurrentUser: entry.fid == currentFid,
      streak: entry.streak || 0,
      neynarScore: entry.neynarScore || 0,
      neynarPowerChange: entry.neynarPowerChange || 0,
      teamScore: entry.teamScore || 0,
      teamMembers: entry.teamMembers || [],
      primaryAddress: entry.primaryAddress
    }));
  },

  getUserProfile: async (fid: number): Promise<LeaderboardEntry> => {
    const res = await fetch(`/api/user?fid=${fid}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    const data = await res.json();
    
    return {
      id: data.fid.toString(),
      username: data.username,
      score: data.score,
      rewards: parseFloat(data.rewards || 0),
      actualRewards: parseFloat(data.actualRewards || 0),
      rank: data.rank,
      pfpUrl: data.pfp_url,
      isCurrentUser: false, // In modal context typically not current user, or doesn't matter
      streak: data.streak,
      neynarScore: data.neynar_score || 0,
      neynarPowerChange: data.neynarPowerChange || 0,
      teamScore: data.teamScore || 0,
      teamMembers: data.teamMembers || [],
      primaryAddress: data.primary_address
    };
  },

  getTasks: async (fid: number): Promise<Task[]> => {
    const res = await fetch(`/api/tasks?fid=${fid}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.tasks || [];
  },

  verifyTask: async (fid: number, taskId: string): Promise<boolean> => {
    const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, taskId, action: 'verify' }),
    });
    const data = await res.json();
    return data.verified === true;
  },

  claimTask: async (fid: number, taskId: string): Promise<{ success: boolean; newScore?: number; error?: string }> => {
    const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, taskId, action: 'claim' }),
    });
    
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, newScore: data.newScore };
  }
};
