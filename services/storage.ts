import { LeaderboardEntry, UserState } from '../types';

const STORAGE_KEY = 'daily_cube_user_v1';

// Helpers
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Static mock data to ensure rank calculations are consistent during the session
const MOCK_NAMES = ['CryptoKing', 'CubeMaster', 'Alex_777', 'Elena_Win', 'Satoshi_N', 'ToTheMoon', 'ClickerPro', 'Ivan_Dev'];
const STATIC_MOCK_DATA = MOCK_NAMES.map((name, i) => ({
  id: `mock-${i}`,
  username: name,
  score: 500 + Math.floor(Math.random() * 5000), // Random score between 500 and 5500
})).sort((a, b) => b.score - a.score);

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

export const getClickPower = (streak: number): number => {
  return 100 + (streak * 10);
};

export const performClick = (currentState: UserState): UserState => {
  const today = getTodayString();
  
  const power = getClickPower(currentState.streak);
  const newScore = currentState.score + power;
  
  const newState: UserState = {
    ...currentState,
    score: newScore,
    lastClickDate: today,
    streak: currentState.streak + 1,
  };
  
  saveUserState(newState);
  return newState;
};

export const calculateRank = (score: number): number => {
  // Combine user score with mock scores and find index
  const allScores = [...STATIC_MOCK_DATA.map(d => d.score), score];
  allScores.sort((a, b) => b - a);
  // rank is index + 1
  return allScores.indexOf(score) + 1;
};

export const getLeaderboardData = (currentUserState: UserState): LeaderboardEntry[] => {
  // Add current user to static mock data
  const userEntry: LeaderboardEntry = {
    id: 'current-user',
    username: currentUserState.username,
    score: currentUserState.score,
    rank: 0,
    isCurrentUser: true,
  };
  
  const allEntries = [...STATIC_MOCK_DATA.map((d, i) => ({
    ...d, 
    rank: 0, // placeholder
    isCurrentUser: false
  })), userEntry].sort((a, b) => b.score - a.score);
  
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