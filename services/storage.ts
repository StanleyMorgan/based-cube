import { LeaderboardEntry, UserState } from '../types';

const STORAGE_KEY = 'daily_cube_user_v1';

// Helpers
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

const generateMockLeaderboard = (): LeaderboardEntry[] => {
  const names = ['CryptoKing', 'CubeMaster', 'Alex_777', 'Elena_Win', 'Satoshi_N', 'ToTheMoon', 'ClickerPro', 'Ivan_Dev'];
  return names.map((name, i) => ({
    id: `mock-${i}`,
    username: name,
    score: Math.floor(Math.random() * 5000) + 100,
    rank: i + 1,
  })).sort((a, b) => b.score - a.score);
};

// Initial State
const initialState: UserState = {
  score: 0,
  lastClickDate: null,
  streak: 0,
  username: 'You (Player)',
};

export const getUserState = (): UserState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }
  return initialState;
};

export const saveUserState = (state: UserState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
};

export const canClickCube = (lastClickDate: string | null): boolean => {
  if (!lastClickDate) return true;
  return lastClickDate !== getTodayString();
};

export const performClick = (currentState: UserState): UserState => {
  const today = getTodayString();
  
  // Logic for streak could be improved to check if yesterday was clicked, 
  // but for simplicity, we just increment.
  const newScore = currentState.score + 100 + (currentState.streak * 10);
  
  const newState: UserState = {
    ...currentState,
    score: newScore,
    lastClickDate: today,
    streak: currentState.streak + 1,
  };
  
  saveUserState(newState);
  return newState;
};

export const getLeaderboardData = (currentUserState: UserState): LeaderboardEntry[] => {
  // Generate static mock data (stable for session typically, but regenerating here for simplicity)
  const mockData = generateMockLeaderboard();
  
  // Add current user
  const userEntry: LeaderboardEntry = {
    id: 'current-user',
    username: currentUserState.username,
    score: currentUserState.score,
    rank: 0,
    isCurrentUser: true,
  };
  
  const allEntries = [...mockData, userEntry].sort((a, b) => b.score - a.score);
  
  // Re-assign ranks
  return allEntries.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
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