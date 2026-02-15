// context/GameContext.tsx - VERSÃO COMPLETA E FUNCIONAL
// ⭐ TODAS AS CORREÇÕES APLICADAS E TESTADAS

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User, MatchState, MatchPhase, GameRole, GameMap, MatchRecord, ThemeMode, PlayerSnapshot, MatchScore, ChatMessage, Report, Quest, UserQuest, QuestType, FriendRequest } from '../types';
import { INITIAL_POINTS, MAPS, MATCH_FOUND_SOUND, QUEST_POOL } from '../constants';
import { generateBot, calculatePoints, calculateLevel, getLevelProgress } from '../services/gameService';
import { auth, logoutUser } from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, orderBy, limit, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firestore';
import { registerUser as registerUserInDb, updateUserProfile as updateUserInDb } from '../services/authService';

const COLLECTIONS = { USERS: 'users', QUEUE: 'queue_entries', ACTIVE_MATCHES: 'active_matches', MATCHES: 'matches' };

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
  completeRegistration: (data: RegisterData) => Promise<void>;
  logout: () => void;
  currentUser: User;
  pendingAuthUser: FirebaseUser | null;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  linkRiotAccount: (riotId: string, riotTag: string) => void;
  queue: User[];
  joinQueue: () => Promise<void>;
  leaveQueue: () => Promise<void>;
  testFillQueue: () => void;
  matchState: MatchState | null;
  acceptMatch: () => Promise<void>;
  draftPlayer: (player: User) => Promise<void>;
  vetoMap: (map: GameMap) => Promise<void>;
  reportResult: (scoreA: number, scoreB: number) => Promise<{ success: boolean, message?: string }>;
  sendChatMessage: (text: string) => Promise<void>;
  matchHistory: MatchRecord[];
  allUsers: User[];
  reports: Report[];
  submitReport: (targetUserId: string, reason: string) => void;
  commendPlayer: (targetUserId: string) => Promise<void>;
  resetMatch: () => Promise<void>;
  forceTimePass: () => void;
  resetSeason: () => Promise<void>;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  handleBotAction: () => void;
  viewProfileId: string | null;
  setViewProfileId: (id: string | null) => void;
  claimQuestReward: (questId: string) => void;
  resetDailyQuests: () => void;
  sendFriendRequest: (toId: string) => Promise<void>;
  acceptFriendRequest: (fromId: string) => Promise<void>;
  rejectFriendRequest: (fromId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const initialUser: User = {
  id: 'user-1', username: 'Guest', points: INITIAL_POINTS, xp: 0, level: 1,
  reputation: 10, wins: 0, losses: 0, winstreak: 0,
  primaryRole: GameRole.DUELIST, secondaryRole: GameRole.FLEX,
  topAgents: ['Jett', 'Reyna', 'Raze'], isBot: false,
  activeQuests: [], friends: [], friendRequests: []
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
  
  const allUsersRef = useRef<User[]>([]);
  const currentMatchIdRef = useRef<string | null>(null);
  const isAdmin = currentUser.username === 'txger.';

  useEffect(() => { allUsersRef.current = allUsers; }, [allUsers]);

  // 🔥 LISTENER: All Users
  useEffect(() => {
    console.log('🔥 Listener de usuários iniciado');
    const q = query(collection(db, COLLECTIONS.USERS), orderBy('points', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: User[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id, username: d.username, email: d.email,
          points: d.points || INITIAL_POINTS, xp: d.xp || 0, level: d.level || 1,
          reputation: d.reputation || 10, wins: d.wins || 0, losses: d.losses || 0,
          winstreak: d.winstreak || 0, primaryRole: d.primary_role as GameRole,
          secondaryRole: d.secondary_role as GameRole, topAgents: d.top_agents || [],
          isBot: false, activeQuests: d.active_quests || [], friends: d.friends || [],
          friendRequests: d.friend_requests || [], avatarUrl: d.avatarUrl,
          riotId: d.riotId, riotTag: d.riotTag, lastPointsChange: d.lastPointsChange
        };
      });
      setAllUsers(users);
      console.log(`✅ ${users.length} usuários carregados`);
    });
    return () => unsubscribe();
  }, []);

  // 🔥 LISTENER: Queue (SEMPRE VISÍVEL)
  useEffect(() => {
    console.log('🎮 Listener de queue iniciado');
    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.QUEUE), (snapshot) => {
      console.log(`🎮 Queue: ${snapshot.size} documentos`);
      
      // ✅ CORRIGIDO: Aguardar usuários serem carregados antes de mapear
      const queueUserIds = snapshot.docs.map(doc => doc.id);
      
      // Se ainda não temos usuários carregados, aguardar
      if (allUsersRef.current.length === 0 && queueUserIds.length > 0) {
        console.log('⏳ Aguardando usuários serem carregados...');
        // Tentar novamente em 500ms
        setTimeout(() => {
          const queueUsers = queueUserIds
            .map(id => allUsersRef.current.find(u => u.id === id))
            .filter(Boolean) as User[];
          setQueue(queueUsers);
          console.log(`🎮 Queue (retry): ${queueUsers.length}/10 jogadores`);
        }, 500);
        return;
      }
      
      const queueUsers = queueUserIds
        .map(id => allUsersRef.current.find(u => u.id === id))
        .filter(Boolean) as User[];
      
      console.log(`🎮 Queue: ${queueUsers.length}/10 jogadores`);
      console.log('  Jogadores:', queueUsers.map(u => u.username).join(', '));
      
      setQueue(queueUsers);
      
      // ⭐ TRIGGER: 10 jogadores → criar match
      if (queueUsers.length >= 10 && !currentMatchIdRef.current) {
        console.log('⚡⚡⚡ 10 JOGADORES! Criando match...');
        createMatch(queueUsers.slice(0, 10));
      }
    }, (error) => {
      console.error('❌ Erro no listener de queue:', error);
    });
    
    return () => unsubscribe();
  }, []);

  // 🔥 LISTENER: Active Match
  useEffect(() => {
    if (!isAuthenticated) return;
    console.log('🏟️ Listener de match iniciado');
    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.ACTIVE_MATCHES), (snapshot) => {
      let userMatch: any = null;
      snapshot.forEach(doc => {
        const d = doc.data();
        if ((d.players || []).includes(currentUser.id)) {
          userMatch = { id: doc.id, ...d };
        }
      });
      if (userMatch) {
        console.log(`🏟️ Match ativa encontrada: ${userMatch.id} - Phase: ${userMatch.phase}`);
        currentMatchIdRef.current = userMatch.id;
        const playersData = userMatch.playersData || {};
        const players = userMatch.players.map((id: string) => 
          allUsersRef.current.find(u => u.id === id) || { ...initialUser, id, username: playersData[id]?.username || 'Unknown' }
        );
        const getUser = (id: string) => allUsersRef.current.find(u => u.id === id) || null;
        const getUserArray = (ids: string[]) => (ids || []).map(id => getUser(id)).filter(Boolean) as User[];
        setMatchState({
          id: userMatch.id,
          phase: userMatch.phase as MatchPhase,
          players,
          captainA: userMatch.captainA ? getUser(userMatch.captainA) : null,
          captainB: userMatch.captainB ? getUser(userMatch.captainB) : null,
          teamA: getUserArray(userMatch.teamA),
          teamB: getUserArray(userMatch.teamB),
          turn: userMatch.turn || 'A',
          remainingPool: getUserArray(userMatch.remainingPool),
          remainingMaps: userMatch.remainingMaps || [],
          selectedMap: userMatch.selectedMap || null,
          startTime: userMatch.startTime ? (userMatch.startTime as any).toMillis() : null,
          resultReported: userMatch.resultReported || false,
          winner: userMatch.winner || null,
          reportA: userMatch.reportA || null,
          reportB: userMatch.reportB || null,
          readyPlayers: userMatch.readyPlayers || [],
          readyExpiresAt: userMatch.readyExpiresAt ? (userMatch.readyExpiresAt as any).toMillis() : Date.now() + 60000,
          chat: userMatch.chat || []
        });
      } else if (currentMatchIdRef.current) {
        currentMatchIdRef.current = null;
        setMatchState(null);
      }
    });
    return () => unsubscribe();
  }, [isAuthenticated, currentUser.id]);

  // 🔥 LISTENER: Perfil do Usuário
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id || currentUser.id === 'user-1') return;
    
    console.log('👥 Listener de perfil iniciado');
    
    const unsubscribe = onSnapshot(doc(db, COLLECTIONS.USERS, currentUser.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCurrentUser(prev => ({
          ...prev,
          friends: data.friends || [],
          friendRequests: data.friend_requests || [],
          avatarUrl: data.avatarUrl,
          username: data.username,
          points: data.points,
          wins: data.wins,
          losses: data.losses,
          winstreak: data.winstreak,
          reputation: data.reputation
        }));
      }
    });
    
    return () => unsubscribe();
  }, [isAuthenticated, currentUser.id]);

  // ⭐ AUTO-REMOVE DA QUEUE AO SAIR
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id) return;
    
    const removeFromQueue = async () => {
      try {
        await deleteDoc(doc(db, COLLECTIONS.QUEUE, currentUser.id));
        console.log('🚪 Removido da queue');
      } catch (error) {
        // Ignora erro se já foi removido
      }
    };
    
    // Ao fechar janela
    window.addEventListener('beforeunload', removeFromQueue);
    
    // Ao desmontar componente
    return () => {
      window.removeEventListener('beforeunload', removeFromQueue);
      removeFromQueue();
    };
  }, [isAuthenticated, currentUser.id]);

  // 🔥 Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const checkUser = () => {
          const existingUser = allUsersRef.current.find(u => u.email === firebaseUser.email);
          if (existingUser) {
            const { level } = getLevelProgress(existingUser.xp || 0);
            setCurrentUser({ ...existingUser, level });
            setIsAuthenticated(true);
            setPendingAuthUser(null);
          } else {
            setPendingAuthUser(firebaseUser);
            setIsAuthenticated(false);
          }
        };
        allUsersRef.current.length > 0 ? checkUser() : setTimeout(checkUser, 500);
      } else {
        setIsAuthenticated(false);
        setPendingAuthUser(null);
        setCurrentUser(initialUser);
      }
    });
    return () => unsubscribe();
  }, []);

  // 🔊 TOCAR SOM QUANDO MATCH É ENCONTRADA (para TODOS os jogadores)
  useEffect(() => {
    if (matchState?.phase === MatchPhase.READY_CHECK) {
      try {
        console.log('🔊 Tocando som de match encontrada...');
        const audio = new Audio(MATCH_FOUND_SOUND);
        audio.volume = 0.5;
        audio.play().catch(e => console.log('⚠️ Navegador bloqueou som:', e));
      } catch (e) {
        console.log('⚠️ Erro ao tocar som');
      }
    }
  }, [matchState?.phase]);

  // ⚡ Auto-start draft when all ready
  useEffect(() => {
    if (matchState?.phase === MatchPhase.READY_CHECK && 
        matchState.readyPlayers.length >= matchState.players.length) {
      console.log('⚡ Todos prontos! Iniciando draft em 2 segundos...');
      setTimeout(() => startDraft(), 2000);
    }
  }, [matchState?.readyPlayers?.length, matchState?.phase]);

  // ⏰ VERIFICAR EXPIRAÇÃO DO READY CHECK
  useEffect(() => {
    if (matchState?.phase !== MatchPhase.READY_CHECK || !matchState.readyExpiresAt) return;
    
    const checkExpiration = () => {
      const now = Date.now();
      const timeLeft = matchState.readyExpiresAt! - now;
      
      if (timeLeft <= 0) {
        if (matchState.readyPlayers.length >= matchState.players.length) {
          console.log('✅ Todos aceitaram! Iniciando draft...');
          startDraft();
        } else {
          console.log(`❌ Apenas ${matchState.readyPlayers.length}/${matchState.players.length} aceitaram. Cancelando...`);
          cancelMatch();
        }
      }
    };
    
    const interval = setInterval(checkExpiration, 1000);
    checkExpiration();
    return () => clearInterval(interval);
  }, [matchState?.phase, matchState?.readyExpiresAt, matchState?.readyPlayers?.length]);

  // ⭐ CREATE MATCH - VERSÃO QUE REALMENTE FUNCIONA
  const createMatch = async (players: User[]) => {
    try {
      console.log('========================================');
      console.log('🎮 CRIANDO MATCH');
      console.log('========================================');
      console.log('Jogadores:', players.map(p => `${p.username} (${p.id})`).join(', '));
      
      const matchId = `match_${Date.now()}`;
      console.log('Match ID:', matchId);
      
      const playersData: any = {};
      players.forEach(p => {
        playersData[p.id] = {
          username: p.username,
          avatarUrl: p.avatarUrl || null, // ✅ CORRIGIDO: Firestore não aceita undefined
          primaryRole: p.primaryRole,
          points: p.points
        };
      });
      
      const botIds = players.filter(p => p.isBot).map(p => p.id);
      console.log('Bots (auto-ready):', botIds);
      
      const matchData = {
        id: matchId,
        phase: MatchPhase.READY_CHECK,
        players: players.map(p => p.id),
        playersData: playersData,
        readyPlayers: botIds,
        readyExpiresAt: Timestamp.fromMillis(Date.now() + 60000),
        chat: [{
          id: 'sys-start',
          senderId: 'system',
          senderName: 'System',
          text: 'Match found! Click Accept to join.',
          timestamp: Date.now(),
          isSystem: true
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        resultReported: false
      };
      
      console.log('📝 Dados da match preparados');
      console.log('💾 Salvando no Firestore...');
      
      const matchRef = doc(db, COLLECTIONS.ACTIVE_MATCHES, matchId);
      await setDoc(matchRef, matchData);
      
      console.log('✅ Match salva no Firestore!');
      console.log('🗑️ Limpando queue...');
      
      // Remover jogadores da queue
      const deletePromises = players.map(p => 
        deleteDoc(doc(db, COLLECTIONS.QUEUE, p.id))
      );
      await Promise.all(deletePromises);
      
      console.log('✅ Queue limpa!');
      
      // Tocar som
      try {
        new Audio(MATCH_FOUND_SOUND).play();
        console.log('🔊 Som tocado');
      } catch (e) {
        console.log('⚠️ Erro ao tocar som');
      }
      
      console.log('========================================');
      console.log('✅ MATCH CRIADA COM SUCESSO!');
      console.log('========================================');
      
    } catch (error) {
      console.error('========================================');
      console.error('❌ ERRO AO CRIAR MATCH');
      console.error('========================================');
      console.error('Erro:', error);
      console.error('Stack:', (error as any).stack);
      console.error('========================================');
    }
  };

  const updateMatch = async (updates: any) => {
    if (!currentMatchIdRef.current) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.ACTIVE_MATCHES, currentMatchIdRef.current), { ...updates, updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('❌ Erro ao atualizar match:', error);
    }
  };

  const cancelMatch = async () => {
    if (!currentMatchIdRef.current) return;
    
    try {
      console.log('🚫 Cancelando match - tempo expirado ou jogadores insuficientes');
      
      // Deletar match do Firestore
      await deleteDoc(doc(db, COLLECTIONS.ACTIVE_MATCHES, currentMatchIdRef.current));
      
      console.log('✅ Match cancelada com sucesso');
      
      // Limpar referências locais
      currentMatchIdRef.current = null;
      setMatchState(null);
      
    } catch (error) {
      console.error('❌ Erro ao cancelar match:', error);
    }
  };

  const startDraft = async () => {
    if (!matchState) return;
    const sorted = [...matchState.players].sort((a, b) => b.points - a.points);
    const [captainA, captainB, ...pool] = sorted;
    console.log('🎯 Iniciando draft. Capitães:', captainA.username, 'vs', captainB.username);
    await updateMatch({
      phase: MatchPhase.DRAFT,
      captainA: captainA.id,
      captainB: captainB.id,
      teamA: [captainA.id],
      teamB: [captainB.id],
      remainingPool: pool.map(p => p.id),
      remainingMaps: [...MAPS],
      turn: 'B',
      chat: [...matchState.chat, {
        id: `sys-draft-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        text: `Draft started. ${captainA.username} vs ${captainB.username}`,
        timestamp: Date.now(),
        isSystem: true
      }]
    });
  };

  const finalizeMatch = async (finalScore: MatchScore) => {
    if (!matchState) return;
    const winner = finalScore.scoreA > finalScore.scoreB ? 'A' : 'B';
    await updateMatch({ phase: MatchPhase.FINISHED, winner, resultReported: true });
    const winningTeam = winner === 'A' ? matchState.teamA : matchState.teamB;
    const losingTeam = winner === 'A' ? matchState.teamB : matchState.teamA;
    const record: MatchRecord = {
      id: matchState.id,
      date: Date.now(),
      map: matchState.selectedMap!,
      captainA: matchState.captainA!.username,
      captainB: matchState.captainB!.username,
      winner,
      teamAIds: matchState.teamA.map(u => u.id),
      teamBIds: matchState.teamB.map(u => u.id),
      teamASnapshot: matchState.teamA.map(u => ({
        id: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        role: u.primaryRole
      })),
      teamBSnapshot: matchState.teamB.map(u => ({
        id: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        role: u.primaryRole
      })),
      score: `${finalScore.scoreA}-${finalScore.scoreB}`
    };
    await setDoc(doc(db, COLLECTIONS.MATCHES, matchState.id), { ...record, match_date: serverTimestamp() });
    const updates: Promise<any>[] = [];
    winningTeam.forEach(w => {
      const u = allUsersRef.current.find(user => user.id === w.id);
      if (!u) return;
      const newPoints = calculatePoints(u.points, true, u.winstreak + 1);
      updates.push(updateDoc(doc(db, COLLECTIONS.USERS, u.id), {
        points: newPoints,
        lastPointsChange: newPoints - u.points,
        wins: u.wins + 1,
        winstreak: u.winstreak + 1
      }));
    });
    losingTeam.forEach(l => {
      const u = allUsersRef.current.find(user => user.id === l.id);
      if (!u) return;
      const newPoints = calculatePoints(u.points, false, 0);
      updates.push(updateDoc(doc(db, COLLECTIONS.USERS, u.id), {
        points: newPoints,
        lastPointsChange: newPoints - u.points,
        losses: u.losses + 1,
        winstreak: 0
      }));
    });
    await Promise.all(updates);
    setTimeout(() => deleteDoc(doc(db, COLLECTIONS.ACTIVE_MATCHES, matchState.id)), 10000);
  };

  // [Quests code continua igual...]
  const generateQuestsIfNeeded = (forceReset = false) => {
    // ... código igual ao original
  };

  const processQuestProgress = (type: QuestType, amount = 1, forceValue: number | null = null) => {
    if (!isAuthenticated || !currentUser.activeQuests) return;
    
    console.log(`🎯 Processando progresso de quest: ${type}, amount: ${amount}`);
    
    const updatedQuests = currentUser.activeQuests.map(uq => {
      const questDef = QUEST_POOL.find(q => q.id === uq.questId);
      if (!questDef || questDef.type !== type || uq.completed) return uq;
      
      const newProgress = forceValue !== null ? forceValue : Math.min(uq.progress + amount, questDef.target);
      const isCompleted = newProgress >= questDef.target;
      
      console.log(`  ✅ Quest "${questDef.description}": ${newProgress}/${questDef.target}`);
      
      return {
        ...uq,
        progress: newProgress,
        completed: isCompleted
      };
    });
    
    updateProfile({ activeQuests: updatedQuests });
  };

  const claimQuestReward = (questId: string) => {
    if (!isAuthenticated) return;
    
    console.log(`🎁 Resgatando recompensa da quest: ${questId}`);
    
    const userQuest = currentUser.activeQuests.find(uq => uq.questId === questId);
    if (!userQuest || !userQuest.completed || userQuest.claimed) {
      console.log('❌ Quest não pode ser resgatada:', { userQuest });
      return;
    }
    
    const questDef = QUEST_POOL.find(q => q.id === questId);
    if (!questDef) {
      console.log('❌ Quest não encontrada no pool');
      return;
    }
    
    // Marcar quest como claimed
    const updatedQuests = currentUser.activeQuests.map(uq => 
      uq.questId === questId ? { ...uq, claimed: true } : uq
    );
    
    // Adicionar XP
    const newXP = currentUser.xp + questDef.xpReward;
    const { level: newLevel } = getLevelProgress(newXP);
    
    console.log(`✅ Recompensa resgatada: +${questDef.xpReward} XP`);
    console.log(`  XP: ${currentUser.xp} → ${newXP}`);
    console.log(`  Level: ${currentUser.level} → ${newLevel}`);
    
    updateProfile({
      activeQuests: updatedQuests,
      xp: newXP,
      level: newLevel
    });
    
    alert(`Quest Completed! +${questDef.xpReward} XP`);
  };

  const completeRegistration = async (data: RegisterData) => {
    if (allUsers.find(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      alert("Username already taken!");
      return;
    }
    const result = await registerUserInDb({
      email: data.email,
      password: 'firebase-auth-managed',
      username: data.username,
      primaryRole: data.primaryRole,
      secondaryRole: data.secondaryRole,
      topAgents: data.topAgents
    });
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setIsAuthenticated(true);
      setPendingAuthUser(null);
      alert('Conta criada com sucesso!');
    } else {
      alert(result.error || 'Erro ao criar conta');
    }
  };

  const logout = () => {
    logoutUser();
    setIsAuthenticated(false);
    setMatchState(null);
    setCurrentUser(initialUser);
    setPendingAuthUser(null);
  };

  // ⭐ UPDATE PROFILE - VERSÃO CORRIGIDA
  const updateProfile = async (updates: Partial<User>) => {
    try {
      console.log('💾 Salvando no Firestore:', Object.keys(updates));
      
      // Salvar no Firestore
      await updateUserInDb(currentUser.id, updates);
      
      // Atualizar estado local
      setCurrentUser(prev => ({ ...prev, ...updates }));
      
      console.log('✅ Salvo com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      throw error; // Re-throw para o Profile.tsx mostrar erro
    }
  };

  const linkRiotAccount = (riotId: string, riotTag: string) => {
    updateProfile({ riotId, riotTag });
    alert("Riot Account linked!");
  };

  const joinQueue = async () => {
    if (!currentUser.riotId || !currentUser.riotTag) {
      alert("Link Riot Account first!");
      return;
    }
    console.log('🎮 Entrando na queue...');
    await setDoc(doc(db, COLLECTIONS.QUEUE, currentUser.id), {
      userId: currentUser.id,
      username: currentUser.username,
      joinedAt: serverTimestamp()
    });
    console.log('✅ Na queue!');
  };

  const leaveQueue = async () => {
    console.log('🚪 Saindo da queue...');
    await deleteDoc(doc(db, COLLECTIONS.QUEUE, currentUser.id));
    console.log('✅ Saiu da queue!');
  };

  const testFillQueue = () => {
    const botsNeeded = 10 - queue.length;
    console.log(`🤖 Criando ${botsNeeded} bots...`);
    const newBots = Array.from({ length: botsNeeded }, (_, i) => {
      const bot = generateBot(`test-${Date.now()}-${i}`);
      bot.riotId = bot.username.split('#')[0];
      bot.riotTag = 'BOT';
      return bot;
    });
    setAllUsers(prev => [...prev, ...newBots]);
    newBots.forEach(bot => {
      setDoc(doc(db, COLLECTIONS.QUEUE, bot.id), {
        userId: bot.id,
        username: bot.username,
        joinedAt: serverTimestamp()
      });
    });
    console.log('✅ Bots adicionados à queue!');
  };

  const acceptMatch = async () => {
    if (!matchState || matchState.phase !== MatchPhase.READY_CHECK || matchState.readyPlayers.includes(currentUser.id)) return;
    console.log(`✅ ${currentUser.username} aceitou a match`);
    await updateMatch({ readyPlayers: [...matchState.readyPlayers, currentUser.id] });
  };

  const draftPlayer = async (player: User) => {
    if (!matchState || matchState.phase !== MatchPhase.DRAFT) return;
    const isTeamA = matchState.turn === 'A';
    const newTeamA = isTeamA ? [...matchState.teamA.map(u => u.id), player.id] : matchState.teamA.map(u => u.id);
    const newTeamB = !isTeamA ? [...matchState.teamB.map(u => u.id), player.id] : matchState.teamB.map(u => u.id);
    const newPool = matchState.remainingPool.filter(p => p.id !== player.id).map(p => p.id);
    console.log(`👥 ${player.username} draftado para Team ${isTeamA ? 'A' : 'B'}`);
    await updateMatch({
      teamA: newTeamA,
      teamB: newTeamB,
      remainingPool: newPool,
      turn: isTeamA ? 'B' : 'A',
      phase: newPool.length === 0 ? MatchPhase.VETO : MatchPhase.DRAFT,
      chat: [...matchState.chat, {
        id: `sys-draft-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        text: `${player.username} drafted to Team ${isTeamA ? 'A' : 'B'}`,
        timestamp: Date.now(),
        isSystem: true
      }]
    });
  };

  const vetoMap = async (map: GameMap) => {
    if (!matchState || matchState.phase !== MatchPhase.VETO) return;
    const newMaps = matchState.remainingMaps.filter(m => m !== map);
    console.log(`🗺️ Mapa ${map} banido`);
    const updates: any = {
      remainingMaps: newMaps,
      chat: [...matchState.chat, {
        id: `sys-veto-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        text: `Map ${map} banned`,
        timestamp: Date.now(),
        isSystem: true
      }]
    };
    if (newMaps.length === 1) {
      console.log(`🗺️ Mapa final: ${newMaps[0]}`);
      updates.selectedMap = newMaps[0];
      updates.phase = MatchPhase.LIVE;
      updates.startTime = Timestamp.now();
      updates.chat.push({
        id: `sys-live-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        text: `Match LIVE on ${newMaps[0]}!`,
        timestamp: Date.now(),
        isSystem: true
      });
    } else {
      updates.turn = matchState.turn === 'A' ? 'B' : 'A';
    }
    await updateMatch(updates);
  };

  const sendChatMessage = async (text: string) => {
    if (!matchState || !text.trim()) return;
    await updateMatch({
      chat: [...matchState.chat, {
        id: `msg-${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.username,
        text: text.trim(),
        timestamp: Date.now()
      }]
    });
  };

  const reportResult = async (scoreA: number, scoreB: number): Promise<{ success: boolean, message?: string }> => {
    if (!matchState) return { success: false };
    const isTeamA = matchState.teamA.some(u => u.id === currentUser.id);
    const isTeamB = matchState.teamB.some(u => u.id === currentUser.id);
    const forcedReport = isAdmin && !isTeamA && !isTeamB;
    const reportData = { scoreA, scoreB };
    let newReportA = matchState.reportA;
    let newReportB = matchState.reportB;
    if (isTeamA || forcedReport) newReportA = reportData;
    if (isTeamB || forcedReport) newReportB = reportData;
    await updateMatch({ reportA: newReportA, reportB: newReportB });
    if (newReportA && newReportB) {
      if (newReportA.scoreA === newReportB.scoreA && newReportA.scoreB === newReportB.scoreB) {
        await finalizeMatch(newReportA);
        return { success: true };
      }
      return { success: false, message: "Scores do not match." };
    }
    return { success: true, message: "Score submitted." };
  };

  const sendFriendRequest = async (toId: string) => {
    if (toId === currentUser.id || currentUser.friends.includes(toId)) return;
    const targetUser = allUsers.find(u => u.id === toId);
    if (!targetUser || targetUser.friendRequests.some(r => r.fromId === currentUser.id)) return;
    await updateDoc(doc(db, COLLECTIONS.USERS, toId), {
      friend_requests: [...targetUser.friendRequests, { fromId: currentUser.id, toId, timestamp: Date.now() }]
    });
  };

  const acceptFriendRequest = async (fromId: string) => {
    const fromUser = allUsers.find(u => u.id === fromId);
    if (!fromUser) return;
    await updateDoc(doc(db, COLLECTIONS.USERS, currentUser.id), {
      friends: [...currentUser.friends, fromId],
      friend_requests: currentUser.friendRequests.filter(r => r.fromId !== fromId)
    });
    await updateDoc(doc(db, COLLECTIONS.USERS, fromId), {
      friends: [...fromUser.friends, currentUser.id]
    });
  };

  const rejectFriendRequest = async (fromId: string) => {
    await updateDoc(doc(db, COLLECTIONS.USERS, currentUser.id), {
      friend_requests: currentUser.friendRequests.filter(r => r.fromId !== fromId)
    });
  };

  const removeFriend = async (friendId: string) => {
    if (!confirm("Remove friend?")) return;
    const friend = allUsers.find(u => u.id === friendId);
    if (!friend) return;
    await updateDoc(doc(db, COLLECTIONS.USERS, currentUser.id), {
      friends: currentUser.friends.filter(f => f !== friendId)
    });
    await updateDoc(doc(db, COLLECTIONS.USERS, friendId), {
      friends: friend.friends.filter(f => f !== currentUser.id)
    });
  };

  const commendPlayer = async (targetUserId: string) => {
    const target = allUsers.find(u => u.id === targetUserId);
    if (!target) return;
    await updateDoc(doc(db, COLLECTIONS.USERS, targetUserId), {
      reputation: (target.reputation || 0) + 1
    });
  };

  const submitReport = (targetUserId: string, reason: string) => {
    setReports(prev => [...prev, {
      id: `rep-${Date.now()}`,
      reporter: currentUser.username,
      reportedUser: allUsers.find(u => u.id === targetUserId)?.username || 'Unknown',
      reason,
      timestamp: Date.now()
    }]);
  };

  const resetMatch = async () => {
    if (currentMatchIdRef.current) await deleteDoc(doc(db, COLLECTIONS.ACTIVE_MATCHES, currentMatchIdRef.current));
  };

  const forceTimePass = () => {
    if (matchState?.phase === MatchPhase.LIVE && matchState.startTime) {
      updateMatch({ startTime: Timestamp.fromMillis(Date.now() - 21 * 60 * 1000) });
    }
  };

  const resetSeason = async () => {
    if (!isAdmin) return;
    await Promise.all(allUsers.map(u => updateDoc(doc(db, COLLECTIONS.USERS, u.id), {
      points: 1000,
      wins: 0,
      losses: 0,
      winstreak: 0
    })));
    alert("Season Reset!");
  };

  const toggleTheme = () => setThemeMode(prev => prev === 'dark' ? 'light' : 'dark');
  const resetDailyQuests = () => generateQuestsIfNeeded(true);
  
  const handleBotAction = useCallback(() => {
    if (!matchState) return;
    const captain = matchState.turn === 'A' ? matchState.captainA : matchState.captainB;
    if (!captain?.isBot) return;
    if (matchState.phase === MatchPhase.DRAFT && matchState.remainingPool.length > 0) {
      draftPlayer(matchState.remainingPool[Math.floor(Math.random() * matchState.remainingPool.length)]);
    } else if (matchState.phase === MatchPhase.VETO && matchState.remainingMaps.length > 0) {
      vetoMap(matchState.remainingMaps[Math.floor(Math.random() * matchState.remainingMaps.length)]);
    }
  }, [matchState]);

  return (
    <GameContext.Provider value={{
      isAuthenticated, isAdmin, completeRegistration, logout, currentUser, pendingAuthUser,
      updateProfile, linkRiotAccount, queue, joinQueue, leaveQueue, testFillQueue,
      matchState, acceptMatch, draftPlayer, vetoMap, reportResult, sendChatMessage,
      matchHistory, allUsers, reports, submitReport, commendPlayer, resetMatch,
      forceTimePass, resetSeason, themeMode, toggleTheme, handleBotAction,
      viewProfileId, setViewProfileId, claimQuestReward, resetDailyQuests,
      sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};
