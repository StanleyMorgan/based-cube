export interface UserState {
  score: number;
  lastClickDate: string | null; // ISO Date string YYYY-MM-DD
  streak: number;
  username: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  rank: number;
  isCurrentUser?: boolean;
}

export enum Tab {
  GAME = 'GAME',
  LEADERBOARD = 'LEADERBOARD',
}