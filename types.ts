
export interface TeamMember {
  fid: number;
  pfpUrl?: string;
}

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
  teamMembers?: TeamMember[]; // List of team members
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
  teamMembers?: TeamMember[]; // List of team members
}

export enum Tab {
  GAME = 'GAME',
  LEADERBOARD = 'LEADERBOARD',
  TASKS = 'TASKS',
}