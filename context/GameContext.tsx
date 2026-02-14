
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User, MatchState, MatchPhase, GameRole, GameMap, MatchRecord, ThemeMode, PlayerSnapshot, MatchScore, ChatMessage, Report, Quest, UserQuest, QuestType, FriendRequest } from '../types';
import { INITIAL_POINTS, MAPS, MATCH_FOUND_SOUND, QUEST_POOL } from '../constants';
import { generateBot, calculatePoints, calculateLevel, getLevelProgress } from '../services/gameService';
import { auth, logoutUser } from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface RegisterData {
  email: string;
  username: string;
  primaryRole: GameRole;
  secondaryRole: GameRole;
  topAgents: string[];
}

interface GameContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  completeRegistration: (data: RegisterData) => void;
  logout: () => void;
  currentUser: User;
  pendingAuthUser: FirebaseUser | null;
  updateProfile: (updates: Partial<User>) => void;
  linkRiotAccount: (riotId: string, riotTag: string) => void;
  queue: User[];
  joinQueue: () => void;
  leaveQueue: () => void;
  testFillQueue: () => void;
  matchState: MatchState | null;
  acceptMatch: () => void;
  draftPlayer: (player: User) => void;
  vetoMap: (map: GameMap) => void;
  reportResult: (scoreA: number, scoreB: number) => { success: boolean, message?: string };
  sendChatMessage: (text: string) => void;
  matchHistory: MatchRecord[];
  allUsers: User[];
  reports: Report[]; 
  submitReport: (targetUserId: string, reason: string) => void;
  commendPlayer: (targetUserId: string) => void;
  resetMatch: () => void;
  forceTimePass: () => void;
  resetSeason: () => void;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  handleBotAction: () => void;
  viewProfileId: string | null;
  setViewProfileId: (id: string | null) => void;
  claimQuestReward: (questId: string) => void;
  resetDailyQuests: () => void;
  sendFriendRequest: (toId: string) => void;
  acceptFriendRequest: (fromId: string) => void;
  rejectFriendRequest: (fromId: string) => void;
  removeFriend: (friendId: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const initialUser: User = {
  id: 'user-1',
  username: 'Guest',
  points: INITIAL_POINTS,
  xp: 0,
  level: 1,
  reputation: 10,
  wins: 0,
  losses: 0,
  winstreak: 0,
  primaryRole: GameRole.DUELIST,
  secondaryRole: GameRole.FLEX,
  topAgents: ['Jett', 'Reyna', 'Raze'],
  isBot: false,
  activeQuests: [],
  friends: [],
  friendRequests: []
};

interface GameProviderProps {
    children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [pendingAuthUser, setPendingAuthUser] = useState<FirebaseUser | null>(null);
  
  const [queue, setQueue] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); 
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  // Admin Logic: Reverted to username check as requested
  const isAdmin = currentUser.username === 'txger.';

  // Ref to hold allUsers without triggering re-renders in effects
  const allUsersRef = useRef<User[]>([]);
  
  // Sync ref with state
  useEffect(() => {
    allUsersRef.current = allUsers;
  }, [allUsers]);

  // 1. Real Firebase Listener
  // FIXED: Removed allUsers/currentUser from dependency array to prevent infinite loops
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            // Use ref to check existing users to avoid dependency cycle
            const existingUser = allUsersRef.current.find(u => u.email === firebaseUser.email);

            if (existingUser) {
                const { level } = getLevelProgress(existingUser.xp || 0);
                setCurrentUser({
                    ...existingUser,
                    // Ensure activeQuests is initialized if missing
                    activeQuests: existingUser.activeQuests || [],
                    friends: existingUser.friends || [],
                    friendRequests: existingUser.friendRequests || [],
                    xp: existingUser.xp || 0,
                    level: level
                });
                setIsAuthenticated(true);
                setPendingAuthUser(null);
            } else {
                setPendingAuthUser(firebaseUser);
                setIsAuthenticated(false);
            }
        } else {
            // If user logs out or isn't logged in
            // Only reset if we aren't in a guest session
            setIsAuthenticated(prev => {
                if (prev) {
                    setPendingAuthUser(null);
                    setCurrentUser(initialUser);
                    return false;
                }
                return prev;
            });
        }
    });
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this only attaches once

  useEffect(() => {
    if (isAuthenticated) {
        setAllUsers(prev => {
            if (!prev.find(u => u.id === currentUser.id)) return [...prev, currentUser];
            return prev.map(u => u.id === currentUser.id ? currentUser : u);
        });
    }
  }, [currentUser, isAuthenticated]);

  // Generate Quests on Load/Date Change
  useEffect(() => {
      if (isAuthenticated && !currentUser.isBot && !currentUser.id.startsWith('guest-') && currentUser.username !== 'Guest') {
          generateQuestsIfNeeded();
          if (currentUser.username && currentUser.topAgents.length === 3 && currentUser.riotId) {
              processQuestProgress('COMPLETE_PROFILE', 1, 1);
          }
      }
  }, [isAuthenticated, currentUser.id, currentUser.riotId]); // Added dependencies to trigger when user loads

  // --- AUTOMATION: Watch Ready Players & Auto Start Draft ---
  useEffect(() => {
    if (matchState?.phase === MatchPhase.READY_CHECK) {
        const totalNeeded = matchState.players.length;
        const currentReady = matchState.readyPlayers.length;
        
        if (currentReady >= totalNeeded) {
            // Give a small visual delay so user sees "10/10" before switching
            const timer = setTimeout(() => {
                initializeDraft(matchState.players);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }
  }, [matchState?.readyPlayers.length, matchState?.phase]);

  const generateQuestsIfNeeded = (forceReset: boolean = false) => {
      const today = new Date().setHours(0,0,0,0);
      let currentQuests = currentUser.activeQuests || [];
      let updates: Partial<User> = {};
      let hasUpdates = false;

      // Daily Reset
      const hasDailyQuests = currentQuests.some(uq => QUEST_POOL.find(q => q.id === uq.questId)?.category === 'DAILY');
      const needsDailyReset = forceReset || !hasDailyQuests || (currentUser.lastDailyQuestGeneration && currentUser.lastDailyQuestGeneration < today);

      if (needsDailyReset) {
          currentQuests = currentQuests.filter(uq => QUEST_POOL.find(q => q.id === uq.questId)?.category !== 'DAILY');
          const newDailies = QUEST_POOL.filter(q => q.category === 'DAILY').map(q => ({
              questId: q.id, progress: 0, completed: false, claimed: false
          }));
          currentQuests = [...currentQuests, ...newDailies];
          updates.lastDailyQuestGeneration = Date.now();
          hasUpdates = true;
      }

      // Monthly Reset (Simplified check)
      const hasMonthlyQuests = currentQuests.some(uq => QUEST_POOL.find(q => q.id === uq.questId)?.category === 'MONTHLY');
      if (forceReset || !hasMonthlyQuests) {
           currentQuests = currentQuests.filter(uq => QUEST_POOL.find(q => q.id === uq.questId)?.category !== 'MONTHLY');
           const newMonthlies = QUEST_POOL.filter(q => q.category === 'MONTHLY').map(q => ({
              questId: q.id, progress: 0, completed: false, claimed: false
          }));
          currentQuests = [...currentQuests, ...newMonthlies];
          updates.lastMonthlyQuestGeneration = Date.now();
          hasUpdates = true;
      }

      // Unique Quests
      const uniques = QUEST_POOL.filter(q => q.category === 'UNIQUE');
      uniques.forEach(q => {
          if (!currentQuests.find(uq => uq.questId === q.id)) {
              currentQuests.push({ questId: q.id, progress: 0, completed: false, claimed: false });
              hasUpdates = true;
          }
      });

      if (hasUpdates) {
          setCurrentUser(prev => ({ ...prev, activeQuests: currentQuests, ...updates }));
      }
  };

  const resetDailyQuests = () => generateQuestsIfNeeded(true);

  const processQuestProgress = (type: QuestType, amount: number = 1, forceValue: number | null = null) => {
      setCurrentUser(prev => {
          if (!prev.activeQuests) return prev;
          const updatedQuests = prev.activeQuests.map(uq => {
              const questDef = QUEST_POOL.find(q => q.id === uq.questId);
              if (!questDef || questDef.type !== type || uq.completed) return uq;
              let newProgress = forceValue !== null ? forceValue : uq.progress + amount;
              if (newProgress > questDef.target) newProgress = questDef.target;
              return { ...uq, progress: newProgress, completed: newProgress >= questDef.target };
          });
          return { ...prev, activeQuests: updatedQuests };
      });
  };

  const claimQuestReward = (questId: string) => {
      setCurrentUser(prev => {
          const quest = prev.activeQuests.find(q => q.questId === questId);
          const questDef = QUEST_POOL.find(q => q.id === questId);
          if (!quest || !quest.completed || quest.claimed || !questDef) return prev;

          const newXp = (prev.xp || 0) + questDef.xpReward;
          const { level: newLevel } = getLevelProgress(newXp);

          // Update state and re-check level quests
          const newState = {
              ...prev,
              xp: newXp,
              level: newLevel,
              activeQuests: prev.activeQuests.map(q => q.questId === questId ? { ...q, claimed: true } : q)
          };
          
          if (newLevel > prev.level) {
              newState.activeQuests = newState.activeQuests.map(uq => {
                  const qDef = QUEST_POOL.find(q => q.id === uq.questId);
                  if (!qDef || qDef.type !== 'REACH_LEVEL' || uq.completed) return uq;
                  const completed = newLevel >= qDef.target;
                  return { ...uq, progress: Math.min(newLevel, qDef.target), completed };
              });
          }
          return newState;
      });
  };

  const sendFriendRequest = (toId: string) => {
      if (toId === currentUser.id || currentUser.friends.includes(toId)) return;
      const targetUser = allUsers.find(u => u.id === toId);
      if (!targetUser || targetUser.friendRequests.some(r => r.fromId === currentUser.id)) return;
      
      const newRequest: FriendRequest = { fromId: currentUser.id, toId, timestamp: Date.now() };
      setAllUsers(prev => prev.map(u => u.id === toId ? { ...u, friendRequests: [...u.friendRequests, newRequest] } : u));
      alert(`Request sent to ${targetUser.username}`);
  };

  const acceptFriendRequest = (fromId: string) => {
      setAllUsers(prev => prev.map(u => {
          if (u.id === currentUser.id) return { ...u, friends: [...u.friends, fromId], friendRequests: u.friendRequests.filter(r => r.fromId !== fromId) };
          if (u.id === fromId) return { ...u, friends: [...u.friends, currentUser.id] };
          return u;
      }));
      setCurrentUser(prev => ({ ...prev, friends: [...prev.friends, fromId], friendRequests: prev.friendRequests.filter(r => r.fromId !== fromId) }));
      processQuestProgress('ADD_FRIEND', 1);
  };

  const rejectFriendRequest = (fromId: string) => {
      setAllUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, friendRequests: u.friendRequests.filter(r => r.fromId !== fromId) } : u));
      setCurrentUser(prev => ({ ...prev, friendRequests: prev.friendRequests.filter(r => r.fromId !== fromId) }));
  };

  const removeFriend = (friendId: string) => {
      if (!confirm("Remove friend?")) return;
      setAllUsers(prev => prev.map(u => {
           if (u.id === currentUser.id) return { ...u, friends: u.friends.filter(f => f !== friendId) };
           if (u.id === friendId) return { ...u, friends: u.friends.filter(f => f !== currentUser.id) };
           return u;
      }));
      setCurrentUser(prev => ({ ...prev, friends: prev.friends.filter(f => f !== friendId) }));
  };

  const completeRegistration = (data: RegisterData) => {
    if (allUsers.find(u => u.username.toLowerCase() === data.username.toLowerCase())) {
        alert("Username taken."); return;
    }
    
    const newId = pendingAuthUser?.uid || `guest-${Date.now()}`;

    // Initialize quests for new user immediately
    const initialQuests: UserQuest[] = [
        ...QUEST_POOL.filter(q => q.category === 'DAILY').map(q => ({ questId: q.id, progress: 0, completed: false, claimed: false })),
        ...QUEST_POOL.filter(q => q.category === 'MONTHLY').map(q => ({ questId: q.id, progress: 0, completed: false, claimed: false })),
        ...QUEST_POOL.filter(q => q.category === 'UNIQUE').map(q => ({ questId: q.id, progress: 0, completed: false, claimed: false }))
    ];

    const newUser: User = {
        ...initialUser,
        id: newId,
        email: data.email,
        username: data.username,
        primaryRole: data.primaryRole,
        secondaryRole: data.secondaryRole,
        topAgents: data.topAgents,
        avatarUrl: pendingAuthUser?.photoURL || undefined,
        activeQuests: initialQuests,
        lastDailyQuestGeneration: Date.now(),
        lastMonthlyQuestGeneration: Date.now()
    };
    
    // Immediately update allUsers and force the current state
    setAllUsers(prev => {
        const updated = [...prev, newUser];
        allUsersRef.current = updated; // Sync ref immediately for auth checks
        return updated;
    });

    setCurrentUser(newUser);
    setIsAuthenticated(true);
    setPendingAuthUser(null);
  };

  const logout = () => {
    logoutUser();
    setIsAuthenticated(false);
    setQueue(prev => prev.filter(u => u.id !== currentUser.id));
    setMatchState(null);
    setViewProfileId(null);
    setCurrentUser(initialUser);
  };

  const updateProfile = (updates: Partial<User>) => setCurrentUser(prev => ({ ...prev, ...updates }));
  const linkRiotAccount = (riotId: string, riotTag: string) => {
      updateProfile({ riotId, riotTag });
      processQuestProgress('COMPLETE_PROFILE', 1, 1);
      alert("Riot Account linked successfully!");
  };
  const toggleTheme = () => setThemeMode(prev => prev === 'dark' ? 'light' : 'dark');
  const resetSeason = () => {
      const resetUsers = allUsers.map(u => ({ ...u, points: 1000, wins: 0, losses: 0, winstreak: 0 }));
      setAllUsers(resetUsers);
      const updatedCurrentUser = resetUsers.find(u => u.id === currentUser.id);
      if (updatedCurrentUser) setCurrentUser(updatedCurrentUser);
      alert("Season Reset!");
  };

  const joinQueue = () => {
    if (!currentUser.riotId || !currentUser.riotTag) { alert("Link Riot Account first."); return; }
    if (!queue.find(u => u.id === currentUser.id)) {
      const newQueue = [...queue, currentUser];
      setQueue(newQueue);
      if (newQueue.length >= 10) triggerReadyCheck(newQueue.slice(0, 10));
    }
  };
  const leaveQueue = () => setQueue(prev => prev.filter(u => u.id !== currentUser.id));
  
  const testFillQueue = () => {
    const botsNeeded = 10 - queue.length;
    const newBots: User[] = [];
    for (let i = 0; i < botsNeeded; i++) {
      const bot = generateBot(`test-${Date.now()}-${i}`);
      bot.riotId = bot.username.split('#')[0]; bot.riotTag = 'BOT';
      newBots.push(bot);
    }
    setAllUsers(prev => [...prev, ...newBots]);
    const finalQueue = [...queue, ...newBots];
    setQueue(finalQueue);
    if (finalQueue.length >= 10) triggerReadyCheck(finalQueue.slice(0, 10));
  };

  const triggerReadyCheck = (players: User[]) => {
      new Audio(MATCH_FOUND_SOUND).play().catch(() => {});
      setQueue([]); 

      // Identify bots
      const botIds = players.filter(p => p.isBot).map(p => p.id);

      setMatchState({
          id: `match-${Date.now()}`, 
          phase: MatchPhase.READY_CHECK, 
          players, 
          captainA: null, captainB: null, teamA: [], teamB: [], turn: 'A', remainingPool: [], remainingMaps: [], selectedMap: null, startTime: null, resultReported: false, winner: null, reportA: null, reportB: null, 
          readyPlayers: botIds, // Mark bots as ready immediately
          readyExpiresAt: Date.now() + 60000, chat: []
      });
  };

  const acceptMatch = () => {
      if (!matchState || matchState.phase !== MatchPhase.READY_CHECK || matchState.readyPlayers.includes(currentUser.id)) return;
      setMatchState(prev => prev ? ({ ...prev, readyPlayers: [...prev.readyPlayers, currentUser.id] }) : null);
  };

  const initializeDraft = (players: User[]) => {
    let sortedPlayers = [...players].sort((a, b) => b.points - a.points);
    const captainA = sortedPlayers[0]; const captainB = sortedPlayers[1]; const pool = sortedPlayers.slice(2);
    setMatchState(prev => {
        if (!prev) return null;
        return { ...prev, phase: MatchPhase.DRAFT, captainA, captainB, teamA: [captainA], teamB: [captainB], turn: 'B', remainingPool: pool, remainingMaps: [...MAPS], readyPlayers: [], chat: [{ id: 'sys-start', senderId: 'system', senderName: 'System', text: 'Draft started.', timestamp: Date.now(), isSystem: true }] };
    });
  };

  const sendChatMessage = (text: string) => {
      if (!matchState || !text.trim()) return;
      setMatchState(prev => prev ? ({ ...prev, chat: [...prev.chat, { id: `msg-${Date.now()}`, senderId: currentUser.id, senderName: currentUser.username, text: text.trim(), timestamp: Date.now() }] }) : null);
  };

  // --- BOT ACTIONS (DRAFT & VETO) ---
  const handleBotAction = useCallback(() => {
    if (!matchState) return;

    const isTeamA = matchState.turn === 'A';
    const currentCaptain = isTeamA ? matchState.captainA : matchState.captainB;
    
    // Only proceed if it's a Bot's turn
    if (!currentCaptain || !currentCaptain.isBot) return;

    if (matchState.phase === MatchPhase.DRAFT) {
        // Simple Bot Logic: Pick highest MMR available
        // Or random to make it interesting
        const pickable = matchState.remainingPool;
        if (pickable.length > 0) {
            const randomPlayer = pickable[Math.floor(Math.random() * pickable.length)];
            draftPlayer(randomPlayer);
        }
    } else if (matchState.phase === MatchPhase.VETO) {
        const bannable = matchState.remainingMaps;
        if (bannable.length > 0) {
            const randomMap = bannable[Math.floor(Math.random() * bannable.length)];
            vetoMap(randomMap);
        }
    }
  }, [matchState]); // We must keep matchState here so it reads current state

  const draftPlayer = (player: User) => {
    if (!matchState) return;
    const isTeamA = matchState.turn === 'A';
    setMatchState(prev => {
      if (!prev) return null;
      return { ...prev, teamA: isTeamA ? [...prev.teamA, player] : prev.teamA, teamB: !isTeamA ? [...prev.teamB, player] : prev.teamB, remainingPool: prev.remainingPool.filter(p => p.id !== player.id), turn: isTeamA ? 'B' : 'A', phase: prev.remainingPool.length === 1 ? MatchPhase.VETO : MatchPhase.DRAFT, chat: [...prev.chat, { id: `sys-draft-${Date.now()}`, senderId: 'system', senderName: 'System', text: `${player.username} drafted.`, timestamp: Date.now(), isSystem: true }] };
    });
  };

  useEffect(() => {
    if (matchState?.phase === MatchPhase.DRAFT && matchState.remainingPool.length === 0) {
       setMatchState(prev => prev ? ({ ...prev, phase: MatchPhase.VETO, turn: 'A' }) : null);
    }
  }, [matchState?.remainingPool.length]);

  const vetoMap = (map: GameMap) => {
    if (!matchState) return;
    setMatchState(prev => {
      if (!prev) return null;
      const newMaps = prev.remainingMaps.filter(m => m !== map);
      if (newMaps.length === 1) {
        return { ...prev, remainingMaps: newMaps, selectedMap: newMaps[0], phase: MatchPhase.LIVE, startTime: Date.now(), chat: [...prev.chat, { id: `sys-veto-${Date.now()}`, senderId: 'system', senderName: 'System', text: `Map ${map} banned.`, timestamp: Date.now(), isSystem: true }, { id: `sys-live-${Date.now()}`, senderId: 'system', senderName: 'System', text: `Match Live on ${newMaps[0]}!`, timestamp: Date.now(), isSystem: true }] };
      }
      return { ...prev, remainingMaps: newMaps, turn: prev.turn === 'A' ? 'B' : 'A', chat: [...prev.chat, { id: `sys-veto-${Date.now()}`, senderId: 'system', senderName: 'System', text: `Map ${map} banned.`, timestamp: Date.now(), isSystem: true }] };
    });
  };

  const forceTimePass = () => {
    if (matchState?.phase === MatchPhase.LIVE && matchState.startTime) setMatchState({ ...matchState, startTime: Date.now() - (21 * 60 * 1000) });
  };
  const reportResult = (scoreA: number, scoreB: number) => {
    if (!matchState) return { success: false };
    const isTeamA = matchState.teamA.some(u => u.id === currentUser.id);
    const isTeamB = matchState.teamB.some(u => u.id === currentUser.id);
    const forcedReport = isAdmin && !isTeamA && !isTeamB;
    let newReportA = matchState.reportA; let newReportB = matchState.reportB; const reportData = { scoreA, scoreB };
    if (isTeamA) newReportA = reportData; if (isTeamB) newReportB = reportData; if (isTeamA) newReportB = reportData; if (isTeamB) newReportA = reportData;
    if (forcedReport) { newReportA = reportData; newReportB = reportData; }
    setMatchState(prev => prev ? ({ ...prev, reportA: newReportA, reportB: newReportB }) : null);
    if (newReportA && newReportB) {
        if (newReportA.scoreA === newReportB.scoreA && newReportA.scoreB === newReportB.scoreB) {
            finalizeMatch(newReportA); return { success: true };
        } else { return { success: false, message: "Scores do not match." }; }
    }
    return { success: true, message: "Report submitted." };
  };
  const finalizeMatch = (finalScore: MatchScore) => {
    const winner = finalScore.scoreA > finalScore.scoreB ? 'A' : 'B';
    const scoreString = `${finalScore.scoreA}-${finalScore.scoreB}`;
    setMatchState(prev => prev ? ({ ...prev, phase: MatchPhase.FINISHED, winner: winner, resultReported: true }) : null);
    const winningTeam = winner === 'A' ? matchState?.teamA : matchState?.teamB;
    const losingTeam = winner === 'A' ? matchState?.teamB : matchState?.teamA;
    if (!winningTeam || !losingTeam || !matchState) return;
    const mapUserToSnapshot = (u: User): PlayerSnapshot => ({ id: u.id, username: u.username, avatarUrl: u.avatarUrl, role: u.primaryRole });
    const record: MatchRecord = { id: matchState.id, date: Date.now(), map: matchState.selectedMap!, captainA: matchState.captainA!.username, captainB: matchState.captainB!.username, winner: winner, teamAIds: matchState.teamA.map(u => u.id), teamBIds: matchState.teamB.map(u => u.id), teamASnapshot: matchState.teamA.map(mapUserToSnapshot), teamBSnapshot: matchState.teamB.map(mapUserToSnapshot), score: scoreString };
    setMatchHistory(prev => [record, ...prev]);
    const updatedUsers = [...allUsers];
    winningTeam.forEach(winnerUser => {
      const userIndex = updatedUsers.findIndex(u => u.id === winnerUser.id);
      if (userIndex > -1) {
        const u = updatedUsers[userIndex];
        const newPoints = calculatePoints(u.points, true, u.winstreak + 1);
        updatedUsers[userIndex] = { ...u, points: newPoints, lastPointsChange: newPoints - u.points, wins: u.wins + 1, winstreak: u.winstreak + 1 };
        if (u.id === currentUser.id) { processQuestProgress('PLAY_MATCHES', 1); processQuestProgress('WIN_MATCHES', 1); processQuestProgress('GET_WINSTREAK', 0, u.winstreak + 1); }
      }
    });
    losingTeam.forEach(loserUser => {
      const userIndex = updatedUsers.findIndex(u => u.id === loserUser.id);
      if (userIndex > -1) {
        const u = updatedUsers[userIndex];
        const newPoints = calculatePoints(u.points, false, 0);
        updatedUsers[userIndex] = { ...u, points: newPoints, lastPointsChange: newPoints - u.points, losses: u.losses + 1, winstreak: 0 };
        if (u.id === currentUser.id) { processQuestProgress('PLAY_MATCHES', 1); }
      }
    });
    setAllUsers(updatedUsers);
    const updatedCurrentUser = updatedUsers.find(u => u.id === currentUser.id);
    if (updatedCurrentUser) setCurrentUser(prev => ({ ...prev, points: updatedCurrentUser.points, lastPointsChange: updatedCurrentUser.lastPointsChange, wins: updatedCurrentUser.wins, losses: updatedCurrentUser.losses, winstreak: updatedCurrentUser.winstreak }));
  };
  const submitReport = (targetUserId: string, reason: string) => {
      setReports(prev => [...prev, { id: `rep-${Date.now()}`, reporter: currentUser.username, reportedUser: allUsers.find(u => u.id === targetUserId)?.username || 'Unknown', reason, timestamp: Date.now() }]);
  };
  const commendPlayer = (targetUserId: string) => {
      setAllUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, reputation: (u.reputation || 0) + 1 } : u));
      processQuestProgress('GIVE_COMMENDS', 1);
  };
  const resetMatch = () => setMatchState(null);

  return (
    <GameContext.Provider value={{
      isAuthenticated, isAdmin, completeRegistration, logout,
      currentUser, pendingAuthUser, updateProfile, linkRiotAccount, queue, joinQueue, leaveQueue, testFillQueue,
      matchState, acceptMatch, draftPlayer, vetoMap, reportResult, sendChatMessage,
      matchHistory, allUsers, reports, submitReport, commendPlayer, resetMatch, forceTimePass, resetSeason,
      themeMode, toggleTheme, handleBotAction,
      viewProfileId, setViewProfileId, claimQuestReward, resetDailyQuests,
      sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};
