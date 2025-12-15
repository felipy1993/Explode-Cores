
export enum RuneType {
  FIRE = 'FIRE',     // Red
  WATER = 'WATER',   // Blue
  NATURE = 'NATURE', // Green
  LIGHT = 'LIGHT',   // Yellow
  VOID = 'VOID',     // Purple
  WILD = 'WILD',      // Special visual state for clearing
  POTION = 'POTION'   // Quest Item (Gravity drop objective)
}

export enum TileStatus {
  NORMAL = 'NORMAL',
  MATCHED = 'MATCHED',
  DROPPING = 'DROPPING',
  NEW = 'NEW'
}

export enum PowerUp {
  NONE = 'NONE',
  HORIZONTAL = 'HORIZONTAL',
  VERTICAL = 'VERTICAL',     
  COLOR_BOMB = 'COLOR_BOMB',
  NOVA = 'NOVA'
}

export enum ObstacleType {
  NONE = 'NONE',
  ICE = 'ICE',       // Overlay: Breaks when tile inside matches. Prevents movement.
  STONE = 'STONE',   // Blocker: Takes up slot. Breaks when adjacent match. 2-3 hits.
  CHAINS = 'CHAINS'  // Overlay: Prevents swapping. Breaks when tile inside matches.
}

export interface Tile {
  id: string; 
  type: RuneType;
  status: TileStatus;
  powerUp: PowerUp;
  obstacle: ObstacleType;
  obstacleHealth: number; // For stones (e.g. 2 hits)
  isEmpty: boolean; // For irregular map shapes (holes)
  row: number;
  col: number;
}

export type Grid = Tile[][];

export type LevelObjective = 'SCORE' | 'COLLECT_POTIONS';

export type TutorialType = 'BASIC' | 'STONE' | 'ICE' | 'CHAINS' | 'POTION';

export interface LevelConfig {
  id: number;
  name: string;
  moves: number;
  targetScore: number;
  background: string; 
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  layout: string[]; // Array of strings representing rows ('.' = empty, '#' = tile, 'S' = stone)
  objective: LevelObjective;
  objectiveTarget: number; // e.g., 4 Potions or 5000 points
}

export const BOARD_SIZE = 8;
export const ANIMATION_DELAY = 300;
export const MAX_LIVES = 5;
export const LIFE_REGEN_MS = 30 * 60 * 1000; // 30 minutes

// --- ECONOMY TYPES ---

export type ItemCategory = 'BOOSTER' | 'SKIN' | 'THEME';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ItemCategory;
  icon: string; 
  purchased?: boolean; 
}

export interface PlayerInventory {
  coins: number;
  lives: number;
  lastLifeRegen: number | null; // Timestamp
  lastLoginDate: string; // YYYY-MM-DD
  loginStreak: number;
  starChestProgress: number; // 0 to 20 stars
  highScores: { [levelId: number]: number }; 
  boosters: {
    moves_5: number;
    bomb: number;
    shuffle: number;
  };
  skins: string[]; 
  activeSkin: string;
  themes: string[]; 
  activeTheme: string;
  seenTutorials: TutorialType[]; // Track which tutorials player has seen
  avatar: string; // URL of the selected avatar
}

export interface LevelResult {
  won: boolean;
  score: number;
  stars: number;
  coinsEarned: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string; 
  score: number;
  isPlayer: boolean;
  rank?: number;
}
