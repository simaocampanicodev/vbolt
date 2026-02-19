

export enum GameRole {
  DUELIST = 'Duelist',
  INITIATOR = 'Initiator',
  CONTROLLER = 'Controller',
  SENTINEL = 'Sentinel',
  FLEX = 'Flex'
}

export enum GameMap {
  ASCENT = 'Ascent',
  BIND = 'Bind',
  HAVEN = 'Haven',
  SPLIT = 'Split',
  LOTUS = 'Lotus',
  SUNSET = 'Sunset',
  PEARL = 'Pearl',
  ICEBOX = 'Icebox',
  BREEZE = 'Breeze',
  FRACTURE = 'Fracture',
  ABYSS = 'Abyss'
}

export type QuestType = 'PLAY_MATCHES' | 'WIN_MATCHES' | 'GIVE_COMMENDS' | 'GET_WINSTREAK' | 'ADD_FRIEND' | 'COMPLETE_PROFILE' | 'REACH_LEVEL';
export type QuestCategory = 'DAILY' | 'MONTHLY' | 'UNIQUE';

export interface Quest {
  id: string;
  type: QuestType;
  category: QuestCategory;
  description: string;
  target: number;
  xpReward: number; // XP instead of points
}

export interface UserQuest {
  questId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface FriendRequest {
    fromId: string;
    toId: string;
    timestamp: number;
}

/** Staff/display role: owner, mod and dev get dashboard access */
export type UserRole = 'user' | 'owner' | 'mod' | 'dev' | 'helper';

export interface User {
  id: string;
  email?: string;
  username: string;
  avatarUrl?: string;
  /** Custom profile banner image/gif URL; if set, overrides favorite agent banner */
  bannerUrl?: string;
  /** CSS background-position for banner (e.g. "50% 30%"); user chooses visible area when uploading */
  bannerPosition?: string;
  riotId?: string; // Player Name
  riotTag?: string; // #EUW
  points: number; // MMR
  lastPointsChange?: number; // To track how much was gained/lost in last game
  xp: number; // Experience for Leveling
  level: number;
  reputation: number;
  wins: number;
  losses: number;
  winstreak: number;
  primaryRole: GameRole;
  secondaryRole: GameRole;
  topAgents: string[];
  isBot?: boolean;
  /** Last activity timestamp for online status (only shown to others) */
  lastSeenAt?: number;
  /** Staff/display badge: mod, dev, helper */
  role?: UserRole;
  /** Verified badge on profile */
  verified?: boolean;

  // Social
  friends: string[]; // List of User IDs
  friendRequests: FriendRequest[];

  // Quests
  activeQuests: UserQuest[];
  /** User IDs already counted for ADD_FRIEND quest (so re-adding same person does not count again) */
  friendQuestCountedIds?: string[];
  lastDailyQuestGeneration?: number;
  lastMonthlyQuestGeneration?: number;
}

export interface Report {
  id: string;
  reporter: string;
  reportedUser: string;
  reason: string;
  timestamp: number;
}

/** Support ticket or site suggestion (submitted by users, visible in admin dashboard) */
export type TicketType = 'support' | 'suggestion';

export interface Ticket {
  id: string;
  userId: string;
  username: string;
  type: TicketType;
  /** For suggestions: structured parts (e.g. title, description, category) */
  subject?: string;
  message?: string;
  parts?: Record<string, string>;
  timestamp: number;
}

export enum MatchPhase {
  QUEUE = 'QUEUE',
  READY_CHECK = 'READY_CHECK',
  DRAFT = 'DRAFT',
  VETO = 'VETO',
  LIVE = 'LIVE',
  FINISHED = 'FINISHED'
}

export interface MatchScore {
  scoreA: number;
  scoreB: number;
}

export interface PlayerReport {
  playerId: string;
  playerName: string;
  scoreA: number;
  scoreB: number;
  timestamp: number;
}

/** Individual player points change after match result verification */
export interface PlayerPointsChange {
  playerId: string;
  playerName: string;
  pointsChange: number;
  newTotal: number;
  isWinner: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface BannedMap {
  map: GameMap;
  bannedBy: string; // User ID
  bannedByName: string; // Username
  team: 'A' | 'B';
}

export interface MatchState {
  id: string;
  phase: MatchPhase;
  players: User[]; 
  captainA: User | null;
  captainB: User | null;
  teamA: User[];
  teamB: User[];
  turn: 'A' | 'B'; 
  remainingPool: User[]; 
  remainingMaps: GameMap[];
  bannedMaps?: BannedMap[]; // ⭐ NOVO: Mapas banidos com informação de quem baniu
  selectedMap: GameMap | null;
  /** Código da partida (inserido pelos capitães) */
  matchCode?: string | null;
  startTime: number | null; 
  resultReported: boolean;
  winner: 'A' | 'B' | null;
  reportA: MatchScore | null; 
  reportB: MatchScore | null;
  playerReports: PlayerReport[]; // ⭐ Lista de reports de todos os jogadores
  playerPointsChanges: PlayerPointsChange[]; // ⭐ NOVO: Mudanças de pontos individuais após verificação
  readyPlayers: string[]; 
  readyExpiresAt?: number;
  chat: ChatMessage[];
}

export interface PlayerSnapshot {
  id: string;
  username: string;
  avatarUrl?: string;
  role: GameRole;
}

export interface MatchRecord {
  id: string;
  date: number;
  map: GameMap;
  captainA: string;
  captainB: string;
  winner: 'A' | 'B';
  teamAIds: string[];
  teamBIds: string[];
  teamASnapshot: PlayerSnapshot[]; 
  teamBSnapshot: PlayerSnapshot[]; 
  score: string;
  playerPointsChanges?: PlayerPointsChange[]; // ⭐ NOVO: Mudanças de pontos individuais
}

export type ThemeMode = 'dark' | 'light';
