
export interface UserState {
  score: number;
  lastClickDate: string | null; // ISO Date string YYYY-MM-DD
  streak: number;
  username: string;
  fid?: number;
  pfpUrl?: string;
  neynarScore?: number;
  primaryAddress?: string;
  referrerFid?: number;
  referrerAddress?: string;
  teamScore?: number;
  teamMembers?: string[]; // URLs of team avatars (referrer + referrals)
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  rank: number;
  isCurrentUser?: boolean;
  pfpUrl?: string;
  streak: number;
  neynarScore: number;
  teamScore?: number;
  teamMembers?: string[]; // URLs of team avatars
}

export enum Tab {
  GAME = 'GAME',
  LEADERBOARD = 'LEADERBOARD',
  TASKS = 'TASKS',
}