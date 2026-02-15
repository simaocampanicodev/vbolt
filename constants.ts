
import { GameMap, GameRole, Quest } from './types';

export const AGENTS = [
  'Jett', 'Raze', 'Reyna', 'Phoenix', 'Yoru', 'Neon', 'Iso', 'Waylay', // Duelists
  'Sova', 'Breach', 'Skye', 'KAY/O', 'Fade', 'Gekko', 'Tejo', // Initiators
  'Omen', 'Brimstone', 'Viper', 'Astra', 'Harbor', 'Clove', // Controllers
  'Sage', 'Cypher', 'Killjoy', 'Chamber', 'Deadlock', 'Vyse', 'Veto' // Sentinels
];

export const MAPS: GameMap[] = [
  GameMap.ASCENT,
  GameMap.BIND,
  GameMap.HAVEN,
  GameMap.SPLIT,
  GameMap.LOTUS,
  GameMap.SUNSET,
  GameMap.PEARL,
  GameMap.ICEBOX,
  GameMap.BREEZE,
  GameMap.FRACTURE,
  GameMap.ABYSS
];

// Map UUIDs for media.valorant-api.com
export const MAP_IMAGES: Record<GameMap, string> = {
    [GameMap.ASCENT]: "https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png",
    [GameMap.BIND]: "https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/splash.png",
    [GameMap.HAVEN]: "https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/splash.png",
    [GameMap.SPLIT]: "https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/splash.png",
    [GameMap.LOTUS]: "https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/splash.png",
    [GameMap.SUNSET]: "https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/splash.png",
    [GameMap.PEARL]: "https://media.valorant-api.com/maps/fd267378-4d1d-484f-ff52-77821ed10dc2/splash.png",
    [GameMap.ICEBOX]: "https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/splash.png",
    [GameMap.BREEZE]: "https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/splash.png",
    [GameMap.FRACTURE]: "https://media.valorant-api.com/maps/b529448b-4d60-346e-e89e-00a4c527a405/splash.png",
    [GameMap.ABYSS]: "https://media.valorant-api.com/maps/224b0a95-48b9-f703-1bd8-67aca101a61f/splash.png"
};

// Agent Icons
export const AGENT_IMAGES: Record<string, string> = {
    'Jett': 'https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png',
    'Raze': 'https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/displayicon.png',
    'Reyna': 'https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/displayicon.png',
    'Phoenix': 'https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/displayicon.png',
    'Yoru': 'https://media.valorant-api.com/agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/displayicon.png',
    'Neon': 'https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/displayicon.png',
    'Iso': 'https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png',
    'Waylay': 'https://titles.trackercdn.com/valorant-api/agents/df1cb487-4902-002e-5c17-d28e83e78588/displayicon.png',
    'Sova': 'https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/displayicon.png',
    'Breach': 'https://media.valorant-api.com/agents/5f8d3a7f-467b-97f3-062c-13acf203c006/displayicon.png',
    'Skye': 'https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b3908627744d/displayicon.png',
    'KAY/O': 'https://media.valorant-api.com/agents/601dbbe7-43ce-be57-2a40-4abd24953621/displayicon.png',
    'Fade': 'https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/displayicon.png',
    'Tejo': 'https://titles.trackercdn.com/valorant-api/agents/b444168c-4e35-8076-db47-ef9bf368f384/displayicon.png',
    'Gekko': 'https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png',
    'Omen': 'https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/displayicon.png',
    'Brimstone': 'https://media.valorant-api.com/agents/9f0d8ba9-4140-b941-57d3-a7ad57c6b417/displayicon.png',
    'Viper': 'https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/displayicon.png',
    'Astra': 'https://media.valorant-api.com/agents/41fb69c1-4189-7b37-f117-bcaf1e96f1bf/displayicon.png',
    'Harbor': 'https://media.valorant-api.com/agents/95b78ed7-4637-86d9-7e41-71ba8c293152/displayicon.png',
    'Clove': 'https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-daa5eed44993/displayicon.png',
    'Sage': 'https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/displayicon.png',
    'Cypher': 'https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/displayicon.png', 
    'Killjoy': 'https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/displayicon.png',
    'Chamber': 'https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/displayicon.png',
    'Deadlock': 'https://media.valorant-api.com/agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/displayicon.png',
    'Vyse': 'https://media.valorant-api.com/agents/efba5359-4016-a1e5-7626-b1ae76895940/displayicon.png',
    'Veto': 'https://static.wikia.nocookie.net/valorant/images/4/4e/Veto_icon.png' 
};

// Agent Banner Images (Full Art) - Using High Res Official API
const DEFAULT_BANNER = 'https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/fullportrait.png';

export const AGENT_BANNERS: Record<string, string> = {
    'Jett': 'https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/fullportrait.png',
    'Reyna': 'https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/fullportrait.png',
    'Raze': 'https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/fullportrait.png',
    'Omen': 'https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/fullportrait.png',
    'Phoenix': 'https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/fullportrait.png',
    'Yoru': 'https://media.valorant-api.com/agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/fullportrait.png',
    'Neon': 'https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/fullportrait.png',
    'Iso': 'https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/fullportrait.png',
    'Sova': 'https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/fullportrait.png',
    'Breach': 'https://media.valorant-api.com/agents/5f8d3a7f-467b-97f3-062c-13acf203c006/fullportrait.png',
    'Skye': 'https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b3908627744d/fullportrait.png',
    'KAY/O': 'https://media.valorant-api.com/agents/601dbbe7-43ce-be57-2a40-4abd24953621/fullportrait.png',
    'Brimstone': 'https://media.valorant-api.com/agents/9f0d8ba9-4140-b941-57d3-a7ad57c6b417/fullportrait.png',
    'Viper': 'https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/fullportrait.png',
    'Astra': 'https://media.valorant-api.com/agents/41fb69c1-4189-7b37-f117-bcaf1e96f1bf/fullportrait.png',
    'Sage': 'https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/fullportrait.png',
    'Cypher': 'https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/fullportrait.png',
    'Killjoy': 'https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/fullportrait.png',
    'Chamber': 'https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/fullportrait.png',
    'Gekko': 'https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/fullportrait.png',
    'Harbor': 'https://media.valorant-api.com/agents/95b78ed7-4637-86d9-7e41-71ba8c293152/fullportrait.png',
    'Fade': 'https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/fullportrait.png',
    'Deadlock': 'https://media.valorant-api.com/agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/fullportrait.png',
    'Clove': 'https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-daa5eed44993/fullportrait.png',
    'Vyse': 'https://media.valorant-api.com/agents/efba5359-4016-a1e5-7626-b1ae76895940/fullportrait.png',
    // Fallbacks using Jett for custom/test agents to prevent broken images
    'Tejo': 'https://media.valorant-api.com/agents/b444168c-4e35-8076-db47-ef9bf368f384/fullportrait.png',
    'Waylay': 'https://media.valorant-api.com/agents/df1cb487-4902-002e-5c17-d28e83e78588/fullportrait.png',
    'Veto': 'https://media.valorant-api.com/agents/92eeef5d-43b5-1d4a-8d03-b3927a09034b/fullportrait.png'
};

export const ROLES: GameRole[] = [
  GameRole.DUELIST,
  GameRole.INITIATOR,
  GameRole.CONTROLLER,
  GameRole.SENTINEL,
  GameRole.FLEX
];

export const INITIAL_POINTS = 1000;

export const MATCH_FOUND_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"; 

export const RANK_THRESHOLDS = [
  { name: 'Iron', min: 0, color: '#9ca3af' }, 
  { name: 'Bronze', min: 900, color: '#d97706' }, 
  { name: 'Silver', min: 1000, color: '#e5e7eb' }, 
  { name: 'Gold', min: 1050, color: '#facc15' },
  { name: 'Platinum', min: 1100, color: '#60a5fa' }, 
  { name: 'Diamond', min: 1150, color: '#c084fc' }, 
  { name: 'Ascendant', min: 1200, color: '#34d399' }, 
  { name: 'Immortal', min: 1250, color: '#f87171' }, 
  { name: 'Radiant', min: 1300, color: '#fef08a' }, 
];

export const QUEST_POOL: Quest[] = [
  // --- DAILY ---
  { id: 'q_daily_win_1', type: 'WIN_MATCHES', category: 'DAILY', description: 'First Win of the Day', target: 1, xpReward: 50 },
  { id: 'q_daily_play_1', type: 'PLAY_MATCHES', category: 'DAILY', description: 'Team Player (Play 1)', target: 1, xpReward: 30 },
  { id: 'q_daily_play_3', type: 'PLAY_MATCHES', category: 'DAILY', description: 'Daily Grind (Play 3)', target: 3, xpReward: 100 },
  { id: 'q_daily_commend_1', type: 'GIVE_COMMENDS', category: 'DAILY', description: 'Spread Positivity (Commend)', target: 1, xpReward: 20 },
  
  // --- MONTHLY ---
  { id: 'q_monthly_play_10', type: 'PLAY_MATCHES', category: 'MONTHLY', description: 'Monthly Grind (Play 10)', target: 10, xpReward: 400 },
  { id: 'q_monthly_win_5', type: 'WIN_MATCHES', category: 'MONTHLY', description: 'Monthly Champion (Win 5)', target: 5, xpReward: 500 },
  { id: 'q_monthly_win_20', type: 'WIN_MATCHES', category: 'MONTHLY', description: 'Ranked Demon (Win 20)', target: 20, xpReward: 2000 },
  { id: 'q_monthly_commend_10', type: 'GIVE_COMMENDS', category: 'MONTHLY', description: 'Community Pillar (Commend 10)', target: 10, xpReward: 250 },
  
  // --- UNIQUE ---
  { id: 'q_unique_profile', type: 'COMPLETE_PROFILE', category: 'UNIQUE', description: 'Complete Your Profile', target: 1, xpReward: 25 },
  { id: 'q_unique_add_friend', type: 'ADD_FRIEND', category: 'UNIQUE', description: 'Social Butterfly (Add Friend)', target: 1, xpReward: 40 },
  { id: 'q_unique_invite_10', type: 'ADD_FRIEND', category: 'UNIQUE', description: 'Squad Leader (Add 10 Friends)', target: 10, xpReward: 1000 },
  { id: 'q_unique_level_5', type: 'REACH_LEVEL', category: 'UNIQUE', description: 'Rising Star (Reach Level 5)', target: 5, xpReward: 500 },
  { id: 'q_unique_level_10', type: 'REACH_LEVEL', category: 'UNIQUE', description: 'Veteran (Reach Level 10)', target: 10, xpReward: 1500 },
];
