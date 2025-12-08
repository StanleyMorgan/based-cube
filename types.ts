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
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  rank: number;
  isCurrentUser?: boolean;
  pfpUrl?: string;
}

export enum Tab {
  GAME = 'GAME',
  LEADERBOARD = 'LEADERBOARD',
}