
export interface TeamMember {
  fid: number;
  pfpUrl?: string;
}

export interface UserState {
  score: number;
  rewards: number;
  lastClickDate: string | null; // ISO Date string YYYY-MM-DD
  streak: number;
  username: string;
  fid?: number;
  pfpUrl?: string;
  neynarScore?: number;
  neynarPowerChange?: number; // Difference from previous sync
  primaryAddress?: string;
  referrerFid?: number;
  referrerAddress?: string;
  teamScore?: number;
  teamMembers?: TeamMember[]; // List of team members
  contractAddress?: string; // Dynamic contract address from DB
  version?: number; // Contract version (1 or 2)
  streamTarget?: boolean;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  rewards: number;
  rank: number;
  isCurrentUser?: boolean;
  pfpUrl?: string;
  streak: number;
  neynarScore: number;
  neynarPowerChange?: number;
  teamScore?: number;
  teamMembers?: TeamMember[]; // List of team members
}

export enum Tab {
  GAME = 'GAME',
  LEADERBOARD = 'LEADERBOARD',
  TASKS = 'TASKS',
}
