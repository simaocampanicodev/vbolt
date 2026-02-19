import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User, MatchState, MatchPhase, GameRole, GameMap, MatchRecord, ThemeMode, PlayerSnapshot, MatchScore, ChatMessage, Report, Quest, UserQuest, QuestType, FriendRequest, Ticket, TicketType, UserRole } from '../types';
import { INITIAL_POINTS, MAPS, MATCH_FOUND_SOUND, QUEST_POOL } from '../constants';
import { generateBot, calculatePoints, calculateLevel, getLevelProgress } from '../services/gameService';
import { auth, logoutUser } from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot,
  query, where, orderBy, limit, serverTimestamp, Timestamp, arrayUnion
} from 'firebase/firestore';
import { db } from '../lib/firestore';
import { registerUser as registerUserInDb, updateUserProfile as updateUserInDb } from '../services/authService';
import { Toast, ToastType } from '../components/ui/Toast';

const COLLECTIONS = { USERS: 'users', QUEUE: 'queue_entries', ACTIVE_MATCHES: 'active_matches', MATCHES: 'matches', TICKETS: 'tickets' };
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

interface RegisterData {
  email: string;
  username: string;
  primaryRole: GameRole;
  secondaryRole: GameRole;
  topAgents: string[];
}

export interface GameContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** txger. or role owner/mod/dev can access dashboard */
  hasDashboardAccess: boolean;
  completeRegistration: (data: RegisterData) => Promise<void>;
  logout: () => void;
  currentUser: User;
  pendingAuthUser: FirebaseUser | null;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  linkRiotAccount: (riotId: string, riotTag: string) => Promise<void>;
  queue: User[];
  /** Timestamp (ms) de quando o utilizador entrou na queue, ou null se não está na fila */
  queueJoinedAt: number | null;
  joinQueue: () => Promise<void>;
  leaveQueue: () => Promise<void>;
  testFillQueue: () => void;
  createTestMatchDirect: () => Promise<void>; // ⭐ NOVO: Criar match direto para LIVE
  exitMatchToLobby: () => Promise<void>; // ⭐ NOVO: Sair da match e voltar ao lobby
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
  replyToTicket: (ticketId: string, replyText: string) => Promise<void>;
  commendPlayer: (targetUserId: string) => Promise<void>;
  resetMatch: () => Promise<void>;
  forceTimePass: () => void;
  resetSeason: () => Promise<void>;
  themeMode: ThemeMode;
  handleBotAction: () => void;
  viewProfileId: string | null;
  setViewProfileId: (id: string | null) => void;
  claimQuestReward: (questId: string) => void;
  sendFriendRequest: (toId: string) => Promise<void>;
  acceptFriendRequest: (fromId: string) => Promise<void>;
  rejectFriendRequest: (fromId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  matchInteractions: string[];
  markPlayerAsInteracted: (playerId: string) => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  toasts: Toast[];
  tickets: Ticket[];
  submitTicket: (type: TicketType, subject: string, message: string, parts?: Record<string, string>) => Promise<void>;
  /** Users currently online (lastSeenAt within threshold); for display on other profiles */
  onlineUserIds: Set<string>;
  setUserRole: (userId: string, role: UserRole, verified: boolean) => Promise<void>;
  resetDailyQuests: () => void; // <-- Add this line
}

const initialUser: User = {
  id: 'user-1', username: 'Guest', points: INITIAL_POINTS, xp: 0, level: 1,
  reputation: 10, wins: 0, losses: 0, winstreak: 0,
  primaryRole: GameRole.DUELIST, secondaryRole: GameRole.FLEX,
  topAgents: ['Jett', 'Reyna', 'Raze'], isBot: false,
  activeQuests: [], friends: [], friendRequests: [], friendQuestCountedIds: []
};

export const GameContext = React.createContext<GameContextType>({
  isAuthenticated: false,
  isAdmin: false,
  hasDashboardAccess: false,
  completeRegistration: async () => {},
  logout: () => {},
  currentUser: initialUser,
  pendingAuthUser: null,
  updateProfile: async () => {},
  linkRiotAccount: async () => {},
  queue: [],
  queueJoinedAt: null,
  joinQueue: async () => {},
  leaveQueue: async () => {},
  testFillQueue: () => {},
  createTestMatchDirect: async () => {},
  exitMatchToLobby: async () => {},
  matchState: null,
  acceptMatch: async () => {},
  draftPlayer: async () => {},
  vetoMap: async () => {},
  reportResult: async () => ({ success: false }),
  sendChatMessage: async () => {},
  matchHistory: [],
  allUsers: [],
  reports: [],
  submitReport: () => {},
  replyToTicket: async () => {},
  commendPlayer: async () => {},
  resetMatch: async () => {},
  forceTimePass: () => {},
  resetSeason: async () => {},
  themeMode: 'dark',
  handleBotAction: () => {},
  viewProfileId: null,
  setViewProfileId: () => {},
  claimQuestReward: () => {},
  sendFriendRequest: async () => {},
  acceptFriendRequest: async () => {},
  rejectFriendRequest: async () => {},
  removeFriend: async () => {},
  matchInteractions: [],
  markPlayerAsInteracted: () => {},
  showToast: () => {},
  removeToast: () => {},
  toasts: [],
  tickets: [],
  submitTicket: async () => {},
  onlineUserIds: new Set(),
  setUserRole: async () => {},
  resetDailyQuests: () => {},
});

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [pendingAuthUser, setPendingAuthUser] = useState<FirebaseUser | null>(null);
  const [queue, setQueue] = useState<User[]>([]);
  const [queueJoinedAt, setQueueJoinedAt] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [themeMode] = useState<ThemeMode>('dark');
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [matchInteractions, setMatchInteractions] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  
  const allUsersRef = useRef<User[]>([]);
  /** Bots added via Fill Queue (not in Firestore USERS); kept so queue/match listeners can resolve them immediately */
  const botUsersRef = useRef<User[]>([]);
  const currentMatchIdRef = useRef<string | null>(null);
  const matchesBeingCreatedRef = useRef<Set<string>>(new Set()); // ⭐ Rastrear matches em processamento
  const lastAppliedPointsMatchIdRef = useRef<string | null>(null); // ⭐ Evitar aplicar pontos duas vezes à mesma partida
  const isAdmin = currentUser.username === 'txger.';
  const hasDashboardAccess = currentUser.username === 'txger.' || currentUser.role === 'owner' || currentUser.role === 'mod' || currentUser.role === 'dev' || currentUser.role === 'helper';
  const onlineUserIds = React.useMemo(() => {
    const now = Date.now();
    const set = new Set<string>();
    allUsers.forEach(u => {
      if (u.lastSeenAt && (now - u.lastSeenAt) < ONLINE_THRESHOLD_MS) set.add(u.id);
    });
    return set;
  }, [allUsers]);

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
          friendRequests: d.friend_requests || [], friendQuestCountedIds: d.friend_quest_counted_ids || [],
          avatarUrl: d.avatarUrl, bannerUrl: d.bannerUrl, bannerPosition: d.bannerPosition, riotId: d.riotId, riotTag: d.riotTag,
          lastPointsChange: d.lastPointsChange, lastSeenAt: d.lastSeenAt,
          role: (d.role as UserRole) || 'user', verified: !!d.verified,
          trackerUrl: d.trackerUrl, trackerAddedAt: d.trackerAddedAt,
          twitchUrl: d.twitchUrl, twitchAddedAt: d.twitchAddedAt
        };
      });
      // Preserve bots (they exist only in queue/match, not in Firestore USERS) so they don't disappear
      setAllUsers(prev => [...users, ...(prev || []).filter(u => u.isBot)]);
      console.log(`✅ ${users.length} usuários (Firestore) + bots preservados`);
    });
    return () => unsubscribe();
  }, []);

  // 🔥 LISTENER: Queue (SEMPRE VISÍVEL)
  useEffect(() => {
    console.log('🎮 Listener de queue iniciado');
    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.QUEUE), (snapshot) => {
      console.log(`🎮 Queue: ${snapshot.size} documentos`);
      // ✅ Guardar IDs e o joinedAt do utilizador actual (para cronómetro da fila)
      const queueUserIds: string[] = [];
      let currentUserJoinedAt: number | null = null;
      snapshot.forEach(docSnap => {
        const d = docSnap.data() as any;
        queueUserIds.push(docSnap.id);
        if (docSnap.id === currentUser.id) {
          const ts: any = d.joinedAt;
          if (ts && typeof ts.toMillis === 'function') {
            currentUserJoinedAt = ts.toMillis();
          } else {
            currentUserJoinedAt = Date.now();
          }
        }
      });
      setQueueJoinedAt(currentUserJoinedAt);
      
      const resolveUser = (id: string) =>
        allUsersRef.current.find(u => u.id === id) || botUsersRef.current.find(u => u.id === id) || null;

      // Se ainda não temos usuários carregados (e não são só bots), aguardar
      if (allUsersRef.current.length === 0 && botUsersRef.current.length === 0 && queueUserIds.length > 0) {
        console.log('⏳ Aguardando usuários serem carregados...');
        setTimeout(() => {
          const queueUsers = queueUserIds.map(id => resolveUser(id)).filter(Boolean) as User[];
          setQueue(queueUsers);
          console.log(`🎮 Queue (retry): ${queueUsers.length}/10 jogadores`);
        }, 500);
        return;
      }

      const queueUsers = queueUserIds.map(id => resolveUser(id)).filter(Boolean) as User[];
      
      console.log(`🎮 Queue: ${queueUsers.length}/10 jogadores`);
      console.log('  Jogadores:', queueUsers.map(u => u.username).join(', '));
      
      setQueue(queueUsers);
      
      // ⭐ TRIGGER: Exatamente 10 pessoas → criar 1 match e limpar queue
      if (queueUsers.length >= 10) {
        // Pega apenas os primeiros 10
        const matchPlayers = queueUsers.slice(0, 10);
        const playerIds = matchPlayers.map(u => u.id).sort().join(',');
        
        // Evitar criar matches duplicadas
        if (!matchesBeingCreatedRef.current.has(playerIds)) {
          console.log('⚡⚡⚡ 10 JOGADORES! Criando match e limpando queue...');
          matchesBeingCreatedRef.current.add(playerIds);
          
          createMatch(matchPlayers).finally(() => {
            matchesBeingCreatedRef.current.delete(playerIds);
          });
        }
      }
    }, (error) => {
      console.error('❌ Erro no listener de queue:', error);
    });
    
    return () => unsubscribe();
  }, [currentUser.id]);

  // 🔥 FALLBACK: Se a match está FINISHED mas playerPointsChanges veio vazio (ex.: outros jogadores), buscar em matches/
  useEffect(() => {
    if (!matchState || matchState.phase !== MatchPhase.FINISHED || !matchState.resultReported) return;
    const hasPoints = matchState.playerPointsChanges && matchState.playerPointsChanges.length > 0;
    if (hasPoints) return;
    const matchId = matchState.id;
    getDoc(doc(db, COLLECTIONS.MATCHES, matchId))
      .then((snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        const fromHistory = d?.playerPointsChanges;
        if (!Array.isArray(fromHistory) || fromHistory.length === 0) return;
        setMatchState((prev) => (prev && prev.id === matchId ? { ...prev, playerPointsChanges: fromHistory } : prev));
        console.log('💰 playerPointsChanges carregados do histórico (matches/) para ecrã Match Ended');
      })
      .catch((err) => console.warn('Fallback playerPointsChanges from matches:', err));
  }, [matchState?.id, matchState?.phase, matchState?.resultReported, matchState?.playerPointsChanges?.length]);

  // 🔥 APLICAR OS PRÓPRIOS PONTOS NO FIRESTORE (sem Cloud Functions): quando a partida está FINISHED, cada jogador atualiza o seu documento
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id || currentUser.id === 'user-1') return;
    if (!matchState || matchState.phase !== MatchPhase.FINISHED || !matchState.playerPointsChanges?.length) return;

    const myChange = matchState.playerPointsChanges.find((p: { playerId: string }) => p.playerId === currentUser.id);
    if (!myChange) return;
    if (lastAppliedPointsMatchIdRef.current === matchState.id) return;
    if (currentUser.points === myChange.newTotal && currentUser.lastPointsChange === myChange.pointsChange) {
      lastAppliedPointsMatchIdRef.current = matchState.id;
      return;
    }

    const newWins = (currentUser.wins || 0) + (myChange.isWinner ? 1 : 0);
    const newLosses = (currentUser.losses || 0) + (myChange.isWinner ? 0 : 1);
    const newWinstreak = myChange.isWinner ? (currentUser.winstreak || 0) + 1 : 0;

    const userRef = doc(db, COLLECTIONS.USERS, currentUser.id);
    updateDoc(userRef, {
      points: myChange.newTotal,
      lastPointsChange: myChange.pointsChange,
      wins: newWins,
      losses: newLosses,
      winstreak: newWinstreak
    })
      .then(() => {
        lastAppliedPointsMatchIdRef.current = matchState.id;
        console.log('✅ Pontos aplicados ao próprio perfil (Firestore)');
      })
      .catch((err) => console.warn('⚠️ Falha ao aplicar pontos no Firestore:', err));
  }, [isAuthenticated, currentUser.id, currentUser.points, currentUser.lastPointsChange, currentUser.wins, currentUser.losses, currentUser.winstreak, matchState?.id, matchState?.phase, matchState?.playerPointsChanges]);

  // 🔥 LISTENER: Active Match
  useEffect(() => {
    if (!isAuthenticated) return;
    console.log('🏟️ Listener de match iniciado para user:', currentUser.id);
    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.ACTIVE_MATCHES), (snapshot) => {
      console.log(`🏟️ Snapshot recebido com ${snapshot.size} matches`);
      let userMatch: any = null;
      snapshot.forEach(doc => {
        const d = doc.data();
        console.log(`  📋 Match ${doc.id}: players=${(d.players || []).length}, phase=${d.phase}`);
        if ((d.players || []).includes(currentUser.id)) {
          console.log(`  ✅ Match encontrada para o utilizador!`);
          userMatch = { id: doc.id, ...d };
        }
      });
      if (userMatch) {
        console.log(`🏟️ Match ativa encontrada: ${userMatch.id} - Phase: ${userMatch.phase}`);
        console.log(`  📊 Reports: ${(userMatch.playerReports || []).length}`);
        // Garantir que playerPointsChanges venha do documento (pode vir como array ou undefined)
        const pointsFromDoc = userMatch.playerPointsChanges;
        const playerPointsChanges = Array.isArray(pointsFromDoc) ? pointsFromDoc : [];
        console.log(`  💰 Points Changes: ${playerPointsChanges.length}`);
        currentMatchIdRef.current = userMatch.id;
        const playersData = userMatch.playersData || {};
        const resolveMatchUser = (id: string): User => {
          const fromRef = allUsersRef.current.find(u => u.id === id) || botUsersRef.current.find(u => u.id === id);
          if (fromRef) return fromRef;
          const data = playersData[id];
          if (data) {
            return {
              ...initialUser,
              id,
              username: data.username || 'Unknown',
              primaryRole: (data.primaryRole as GameRole) || initialUser.primaryRole,
              points: typeof data.points === 'number' ? data.points : initialUser.points,
              isBot: !!data.isBot,
              avatarUrl: data.avatarUrl ?? undefined
            };
          }
          return { ...initialUser, id, username: 'Unknown' };
        };
        const players = userMatch.players.map((id: string) => resolveMatchUser(id));
        const getUser = (id: string) => resolveMatchUser(id);
        const getUserArray = (ids: string[]) => (ids || []).map(id => resolveMatchUser(id)).filter(Boolean) as User[];
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
          bannedMaps: userMatch.bannedMaps || [],
          selectedMap: userMatch.selectedMap || null,
          matchCode: userMatch.matchCode || null,
          startTime: userMatch.startTime ? (userMatch.startTime as any).toMillis() : null,
          resultReported: userMatch.resultReported || false,
          winner: userMatch.winner || null,
          reportA: userMatch.reportA || null,
          reportB: userMatch.reportB || null,
          playerReports: userMatch.playerReports || [],
          playerPointsChanges,
          readyPlayers: userMatch.readyPlayers || [],
          readyExpiresAt: userMatch.readyExpiresAt ? (userMatch.readyExpiresAt as any).toMillis() : Date.now() + 60000,
          chat: userMatch.chat || []
        });
      } else if (currentMatchIdRef.current) {
        console.log('🏟️ Utilizador já não está em nenhuma match, limpando...');
        currentMatchIdRef.current = null;
        setMatchState(null);
      }
    }, (error) => {
      console.error('❌ Erro no listener de matches:', error);
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
          friendQuestCountedIds: data.friend_quest_counted_ids || [],
          avatarUrl: data.avatarUrl,
          bannerUrl: data.bannerUrl,
          bannerPosition: data.bannerPosition,
          username: data.username,
          points: data.points,
          wins: data.wins,
          losses: data.losses,
          winstreak: data.winstreak,
          lastPointsChange: data.lastPointsChange,
          reputation: data.reputation,
          activeQuests: data.active_quests || [],
          lastDailyQuestGeneration: data.lastDailyQuestGeneration,
          lastMonthlyQuestGeneration: data.lastMonthlyQuestGeneration,
          lastSeenAt: data.lastSeenAt,
          role: (data.role as UserRole) || 'user',
          verified: !!data.verified,
          trackerUrl: data.trackerUrl,
          trackerAddedAt: data.trackerAddedAt,
          twitchUrl: data.twitchUrl,
          twitchAddedAt: data.twitchAddedAt
        }));
      }
    });
    
    return () => unsubscribe();
  }, [isAuthenticated, currentUser.id]);

  // 🔥 Heartbeat: update lastSeenAt for online status (only for current user)
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id || currentUser.id === 'user-1') return;
    const tick = () => {
      const now = Date.now();
      updateDoc(doc(db, COLLECTIONS.USERS, currentUser.id), { lastSeenAt: now });
      setCurrentUser(prev => ({ ...prev, lastSeenAt: now }));
    };
    tick();
    const interval = setInterval(tick, 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser.id]);

  // 🔥 LISTENER: Tickets (support + suggestions for admin dashboard)
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.TICKETS), orderBy('timestamp', 'desc'), limit(200));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Ticket[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: d.userId,
          username: d.username,
          type: d.type || 'support',
          subject: d.subject,
          message: d.message,
          parts: d.parts,
          timestamp: d.timestamp ?? 0,
          reply: d.reply || undefined,
          status: d.status || 'open'
        };
      });
      setTickets(list);
    });
    return () => unsubscribe();
  }, []);

  // 🔥 LISTENER: Match History (histórico de partidas para MatchHistory e Profile)
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.MATCHES), orderBy('match_date', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: MatchRecord[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        const playerPointsChanges = Array.isArray(d.playerPointsChanges) ? d.playerPointsChanges : undefined;
        return {
          id: docSnap.id,
          date: d.date ?? (d.match_date?.toMillis?.() ?? Date.now()),
          map: d.map ?? 'Ascent',
          captainA: d.captainA ?? '',
          captainB: d.captainB ?? '',
          winner: d.winner ?? 'A',
          teamAIds: Array.isArray(d.teamAIds) ? d.teamAIds : (d.team_a_ids || []),
          teamBIds: Array.isArray(d.teamBIds) ? d.teamBIds : (d.team_b_ids || []),
          teamASnapshot: Array.isArray(d.teamASnapshot) ? d.teamASnapshot : (d.team_a_snapshot || []),
          teamBSnapshot: Array.isArray(d.teamBSnapshot) ? d.teamBSnapshot : (d.team_b_snapshot || []),
          score: d.score ?? '0-0',
          playerPointsChanges
        };
      });
      setMatchHistory(records);
    });
    return () => unsubscribe();
  }, []);

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
          points: p.points,
          isBot: !!p.isBot
        };
      });
      
      const botIds = players.filter(p => p.isBot).map(p => p.id);
      console.log('Bots (auto-ready):', botIds);
      
      const matchData = {
        id: matchId,
        phase: MatchPhase.READY_CHECK,
        players: players.map(p => p.id),
        playersData: playersData,
        matchCode: null,
        readyPlayers: botIds,
        readyExpiresAt: Timestamp.fromMillis(Date.now() + 60000),
        bannedMaps: [], // ⭐ Initialize banned maps array
        chat: [{
          id: 'sys-start',
          senderId: 'system',
          senderName: 'System',
          text: 'Match found! Click Accept to join.',
          timestamp: Date.now(),
          isSystem: true
        }],
        playerReports: [], // ⭐ Array para múltiplos reports
        playerPointsChanges: [], // ⭐ Array para mudanças de pontos individuais
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
    if (!currentMatchIdRef.current) {
      console.error('❌ currentMatchIdRef.current é null!');
      return;
    }
    try {
      console.log(`📝 Atualizando match ${currentMatchIdRef.current} com:`, updates);
      await updateDoc(doc(db, COLLECTIONS.ACTIVE_MATCHES, currentMatchIdRef.current), { ...updates, updatedAt: serverTimestamp() });
      console.log(`✅ Match atualizada com sucesso!`);
    } catch (error) {
      console.error('❌ Erro ao atualizar match:', error);
      console.error('Match ID:', currentMatchIdRef.current);
      console.error('Updates:', updates);
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
    if (!matchState) {
      console.error('❌ matchState é null!');
      return;
    }
    
    console.log('🏁 Finalizando match...');
    console.log('📊 Score final:', finalScore);
    console.log('🏟️ Match ID:', matchState.id);
    console.log('👥 Players:', matchState.players.map(p => p.username).join(', '));
    
    const winner = finalScore.scoreA > finalScore.scoreB ? 'A' : 'B';
    console.log(`🏆 Vencedor: Team ${winner}`);
    
    // ⭐ LER DIRETAMENTE DO FIRESTORE PARA OBTER IDs DAS EQUIPAS
    const matchRef = doc(db, COLLECTIONS.ACTIVE_MATCHES, matchState.id);
    const matchSnap = await getDoc(matchRef);
    
    if (!matchSnap.exists()) {
      console.error('❌ Match não encontrada no Firestore!');
      return;
    }
    
    const firestoreData = matchSnap.data();
    // 🚨 Se o servidor já marcou como resultReported, evitar finalizações duplicadas
    if (firestoreData.resultReported) {
      console.log('⚠️ Match já finalizada no servidor — a operação de finalização será ignorada.');
      return;
    }
    const teamAIds = firestoreData.teamA || [];
    const teamBIds = firestoreData.teamB || [];
    
    console.log('📋 Team A IDs do Firestore:', teamAIds);
    console.log('📋 Team B IDs do Firestore:', teamBIds);
    console.log('📊 Total allUsersRef.current:', allUsersRef.current.length);
    
    // ⭐ FUNÇÃO HELPER: Procurar user em allUsersRef, se não encontrar, carregar do Firestore
    const getUser = async (id: string): Promise<User | null> => {
      // Tentar encontrar em allUsersRef primeiro
      let user = allUsersRef.current.find(u => u.id === id);
      if (user) {
        console.log(`  ✅ User ${id} (${user.username}) encontrado em allUsersRef`);
        return user;
      }
      
      // Se não encontrar, carregar do Firestore
      console.log(`  🔍 User ${id} não em allUsersRef, carregando do Firestore...`);
      try {
        const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, id));
        if (userSnap.exists()) {
          const d = userSnap.data();
          const loadedUser: User = {
            id,
            username: d.username,
            email: d.email,
            points: d.points || INITIAL_POINTS,
            xp: d.xp || 0,
            level: d.level || 1,
            reputation: d.reputation || 10,
            wins: d.wins || 0,
            losses: d.losses || 0,
            winstreak: d.winstreak || 0,
            primaryRole: d.primary_role as GameRole,
            secondaryRole: d.secondary_role as GameRole,
            topAgents: d.top_agents || [],
            isBot: false,
            activeQuests: d.active_quests || [],
            friends: d.friends || [],
            friendRequests: d.friend_requests || [],
            friendQuestCountedIds: d.friend_quest_counted_ids || [],
            avatarUrl: d.avatarUrl,
            bannerUrl: d.bannerUrl,
            bannerPosition: d.bannerPosition,
            riotId: d.riotId,
            riotTag: d.riotTag,
            lastPointsChange: d.lastPointsChange,
            lastSeenAt: d.lastSeenAt,
            role: (d.role as UserRole) || 'user',
            verified: !!d.verified
          };
          console.log(`  ✅ User ${id} (${loadedUser.username}) carregado do Firestore`);
          return loadedUser;
        }
      } catch (e) {
        console.error(`  ❌ Erro ao carregar user ${id} do Firestore:`, e);
      }
      return null;
    };
    
    // ⭐ CONVERTER IDs PARA USERS
    console.log('🔄 Convertendo IDs das equipas para Users...');
    const teamAUsers = await Promise.all(teamAIds.map((id: string) => getUser(id)))
      .then(users => users.filter((u: any) => u && u.id && u.username));
    
    const teamBUsers = await Promise.all(teamBIds.map((id: string) => getUser(id)))
      .then(users => users.filter((u: any) => u && u.id && u.username));
    
    const validWinningTeam = winner === 'A' ? teamAUsers : teamBUsers;
    const validLosingTeam = winner === 'A' ? teamBUsers : teamAUsers;
    
    console.log(`✅ Equipa vencedora (Team ${winner}): ${validWinningTeam.map((u: any) => u.username).join(', ')} (${validWinningTeam.length} jogadores)`);
    console.log(`✅ Equipa perdedora (Team ${winner === 'A' ? 'B' : 'A'}): ${validLosingTeam.map((u: any) => u.username).join(', ')} (${validLosingTeam.length} jogadores)`);
    
    if (validWinningTeam.length === 0 || validLosingTeam.length === 0) {
      console.error('❌ Times inválidos! Não é possível finalizar match.');
      console.error('validWinningTeam:', validWinningTeam);
      console.error('validLosingTeam:', validLosingTeam);
      return;
    }
    
    const record: MatchRecord = {
      id: matchState.id,
      date: Date.now(),
      map: matchState.selectedMap ?? GameMap.ASCENT,
      captainA: matchState.captainA ? matchState.captainA.username : (teamAUsers[0]?.username || 'Unknown'),
      captainB: matchState.captainB ? matchState.captainB.username : (teamBUsers[0]?.username || 'Unknown'),
      winner,
      teamAIds: teamAUsers.map((u: any) => u.id),
      teamBIds: teamBUsers.map((u: any) => u.id),
      teamASnapshot: teamAUsers.map((u: any) => ({
        id: u.id,
        username: u.username || 'Unknown',
        avatarUrl: u.avatarUrl || null,
        role: u.primaryRole || null
      })),
      teamBSnapshot: teamBUsers.map((u: any) => ({
        id: u.id,
        username: u.username || 'Unknown',
        avatarUrl: u.avatarUrl || null,
        role: u.primaryRole || null
      })),
      score: `${finalScore.scoreA}-${finalScore.scoreB}`
    };
    
    const winningTeamAvg = validWinningTeam.length > 0
      ? validWinningTeam.reduce((s, u) => s + (u.points ?? 0), 0) / validWinningTeam.length
      : 0;
    const losingTeamAvg = validLosingTeam.length > 0
      ? validLosingTeam.reduce((s, u) => s + (u.points ?? 0), 0) / validLosingTeam.length
      : 0;

    const pointsChanges: any[] = [];

    console.log('💰 Calculando pontos para equipa vencedora (simulação local)...');
    for (const w of validWinningTeam) {
      const newPoints = calculatePoints(
        Math.round(w.points ?? 0),
        true,
        (w.winstreak ?? 0) + 1,
        losingTeamAvg
      );
      const pointsChange = newPoints - Math.round(w.points ?? 0);

      console.log(`  ✅ ${w.username}: ${w.points} → ${newPoints} (${pointsChange >= 0 ? '+' : ''}${pointsChange})`);

      pointsChanges.push({
        playerId: w.id,
        playerName: w.username,
        pointsChange,
        newTotal: newPoints,
        isWinner: true
      });
    }

    console.log('💰 Calculando pontos para equipa perdedora (simulação local)...');
    for (const l of validLosingTeam) {
      const newPoints = calculatePoints(
        Math.round(l.points ?? 0),
        false,
        0,
        winningTeamAvg
      );
      const pointsChange = newPoints - Math.round(l.points ?? 0);

      console.log(`  ❌ ${l.username}: ${l.points} → ${newPoints} (${pointsChange >= 0 ? '+' : ''}${pointsChange})`);

      pointsChanges.push({
        playerId: l.id,
        playerName: l.username,
        pointsChange,
        newTotal: newPoints,
        isWinner: false
      });
    }

    console.log('ℹ️ Not updating `users` documents from the client (security rules block this).');
    console.log('➡️ Persisting `playerPointsChanges` in match record — run a backend worker (Cloud Function) to apply changes to `users`.');
    console.log('📊 Mudanças:', pointsChanges.map(p => `${p.playerName}: ${p.pointsChange >= 0 ? '+' : ''}${p.pointsChange}`).join(', '));
    
    // ⭐ Adicionar pontos ao record antes de salvar
    const recordWithPoints: MatchRecord = { ...record, playerPointsChanges: pointsChanges };
    
    try {
      await setDoc(doc(db, COLLECTIONS.MATCHES, matchState.id), { ...recordWithPoints, match_date: serverTimestamp() });
      console.log('✅ Match salva no histórico');
    } catch (err: any) {
      console.error('❌ Falha ao salvar match no histórico:', err);
      // Não abortar o fluxo — garantimos que a match é finalizada no estado activo
      showToast('Failed to save match history (check console). Match will still finish locally.', 'warning', 7000);
    }
    
    // ⭐ Armazenar mudanças de pontos no estado da match para o UI exibir
    const scoreResult = { scoreA: finalScore.scoreA, scoreB: finalScore.scoreB };
    console.log('📡 Enviando atualização final para active_matches...');
    await updateMatch({ 
      phase: MatchPhase.FINISHED, 
      winner, 
      resultReported: true,
      resultProcessed: false, // backend must set to true after applying points
      playerPointsChanges: pointsChanges,
      reportA: scoreResult,
      reportB: scoreResult
    });
    console.log('✅ Match finalizada e enviando para todos os jogadores');
    // Pontos: cada jogador aplica os próprios no Firestore via useEffect (sem Cloud Functions)

    // ⭐ Atualizar estado local imediatamente para refletir mudanças de pontos
    console.log('🔄 Atualizando estado local do matchState para FINISHED...');
    setMatchState(prev => prev ? {
      ...prev,
      phase: MatchPhase.FINISHED,
      winner,
      resultReported: true,
      resultProcessed: false,
      playerPointsChanges: pointsChanges,
      reportA: scoreResult,
      reportB: scoreResult
    } : null);

    // Atualizar feedback local do utilizador actual (imediato) para mostrar +/− MMR
    const myChange = pointsChanges.find(p => p.playerId === currentUser.id);
    if (myChange) {
      setCurrentUser(prev => ({ ...prev, lastPointsChange: myChange.pointsChange, points: myChange.newTotal }));
    }

    console.log('✅ Estado local atualizado - match ended screen deve aparecer');

    // ⭐ Deleção do documento deve ser feita pelo backend; só admin pode apagar client-side
    setTimeout(async () => {
      try {
        if (isAdmin) {
          console.log('🗑️ Admin - deletando match do Firestore após 60 segundos');
          await deleteDoc(doc(db, COLLECTIONS.ACTIVE_MATCHES, matchState.id));
        } else {
          console.log('ℹ️ Não é admin — a limpeza do doc ficará a cargo do backend');
        }
      } catch (err) {
        console.warn('⚠️ Falha ao deletar match (ignorado):', err);
      }
    }, 60000);
  };

  // [Quests code continua igual...]
  const generateQuestsIfNeeded = useCallback((forceReset = false) => {
    if (!isAuthenticated || !currentUser.id || currentUser.id === 'user-1') return;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneMonth = 30 * oneDay;
    const lastDaily = currentUser.lastDailyQuestGeneration ?? 0;
    const lastMonthly = currentUser.lastMonthlyQuestGeneration ?? 0;
    const dailyExpired = (now - lastDaily) >= oneDay;
    const monthlyExpired = (now - lastMonthly) >= oneMonth;
    const hasNoQuests = !currentUser.activeQuests || currentUser.activeQuests.length === 0;

    if (!forceReset && !hasNoQuests && !dailyExpired && !monthlyExpired) return;

    const dailyQuests = QUEST_POOL.filter(q => q.category === 'DAILY');
    const monthlyQuests = QUEST_POOL.filter(q => q.category === 'MONTHLY');
    const uniqueQuests = QUEST_POOL.filter(q => q.category === 'UNIQUE');

    let next: UserQuest[] = [];
    if (forceReset || hasNoQuests || dailyExpired) {
      const pick = (arr: typeof dailyQuests, n: number) => {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, n).map(q => ({ questId: q.id, progress: 0, completed: false, claimed: false }));
      };
      // Preserve unique quests from current user's active quests instead of resetting them
      const currentUniqueQuests = (currentUser.activeQuests || []).filter(uq => 
        QUEST_POOL.find(q => q.id === uq.questId)?.category === 'UNIQUE'
      );
      next = [...pick(dailyQuests, 2), ...pick(monthlyQuests, 2), ...currentUniqueQuests];
      // Add missing unique quests
      const existingUniqueIds = currentUniqueQuests.map(uq => uq.questId);
      const missingUnique = uniqueQuests.filter(q => !existingUniqueIds.includes(q.id));
      missingUnique.forEach(q => next.push({ questId: q.id, progress: 0, completed: false, claimed: false }));
    } else {
      next = (currentUser.activeQuests || []).map(uq => {
        const def = QUEST_POOL.find(q => q.id === uq.questId);
        if (!def) return uq;
        if (def.category === 'DAILY' && dailyExpired) return { ...uq, progress: 0, completed: false, claimed: false };
        if (def.category === 'MONTHLY' && monthlyExpired) return { ...uq, progress: 0, completed: false, claimed: false };
        return uq;
      });
      if (dailyExpired) {
        const existingDailyIds = next.filter(uq => QUEST_POOL.find(q => q.id === uq.questId)?.category === 'DAILY').map(uq => uq.questId);
        const toAdd = dailyQuests.filter(q => !existingDailyIds.includes(q.id)).sort(() => Math.random() - 0.5).slice(0, 2 - existingDailyIds.length);
        toAdd.forEach(q => next.push({ questId: q.id, progress: 0, completed: false, claimed: false }));
      }
      if (monthlyExpired) {
        const existingMonthlyIds = next.filter(uq => QUEST_POOL.find(q => q.id === uq.questId)?.category === 'MONTHLY').map(uq => uq.questId);
        const toAdd = monthlyQuests.filter(q => !existingMonthlyIds.includes(q.id)).sort(() => Math.random() - 0.5).slice(0, 2 - existingMonthlyIds.length);
        toAdd.forEach(q => next.push({ questId: q.id, progress: 0, completed: false, claimed: false }));
      }
    }

    const updates: Partial<User> = { activeQuests: next };
    if (forceReset || hasNoQuests || dailyExpired) updates.lastDailyQuestGeneration = now;
    if (forceReset || hasNoQuests || monthlyExpired) updates.lastMonthlyQuestGeneration = now;
    updateProfile(updates);
  }, [isAuthenticated, currentUser.id, currentUser.activeQuests, currentUser.lastDailyQuestGeneration, currentUser.lastMonthlyQuestGeneration]);

  // ⭐ Gerar missões quando o utilizador não tem nenhuma (novas contas ou reset)
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id || currentUser.id === 'user-1') return;
    const quests = currentUser.activeQuests || [];
    if (quests.length === 0) generateQuestsIfNeeded(true);
  }, [isAuthenticated, currentUser.id, currentUser.activeQuests?.length, generateQuestsIfNeeded]);

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

  const claimQuestReward = async (questId: string) => {
    if (!currentUser.id) return;

    // Verificar se a quest já foi claimed (prevenção de spam)
    const quest = currentUser.activeQuests?.find(q => q.questId === questId);
    if (!quest || quest.claimed) {
      console.warn('Quest already claimed!');
      showToast('Quest already claimed!', 'warning');
      return;
    }

    try {
      const updatedQuests = currentUser.activeQuests.map(q =>
        q.questId === questId ? { ...q, claimed: true } : q
      );

      const questDef = QUEST_POOL.find(q => q.id === questId);
      const xpReward = questDef ? questDef.xpReward : 0;

      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        active_quests: updatedQuests,
        xp: (currentUser.xp || 0) + xpReward,
      });

      setCurrentUser({
        ...currentUser,
        activeQuests: updatedQuests,
        xp: (currentUser.xp || 0) + xpReward,
        level: calculateLevel((currentUser.xp || 0) + xpReward)
      });

      showToast(`+${xpReward} XP claimed!`, 'success');
      console.log(`✅ Quest reward claimed: ${xpReward} XP`);
    } catch (error: any) {
      console.error('❌ Erro ao claimar reward:', error);
      showToast(error.message || 'Failed to claim reward', 'error');
    }
  };

  const completeRegistration = async (data: RegisterData) => {
    if (allUsers.find(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      showToast("Username already taken!", 'error');
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
      showToast('Account created successfully!', 'success');
    } else {
      showToast(result.error || 'Error creating account', 'error');
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

  const linkRiotAccount = async (riotId: string, riotTag: string) => {
    await updateProfile({ riotId, riotTag });
    processQuestProgress('COMPLETE_PROFILE', 1);
    showToast("Riot Account linked!", 'success');
  };

  const joinQueue = async () => {
    if (!currentUser.riotId || !currentUser.riotTag) {
      showToast("Link Riot Account first!", 'warning');
      return;
    }
    console.log('🎮 Entrando na queue...');
    await setDoc(doc(db, COLLECTIONS.QUEUE, currentUser.id), {
      userId: currentUser.id,
      username: currentUser.username,
      joinedAt: serverTimestamp()
    });
    console.log('✅ Na queue!');
    setQueueJoinedAt(Date.now());
  };

  const leaveQueue = async () => {
    console.log('🚪 Saindo da queue...');
    await deleteDoc(doc(db, COLLECTIONS.QUEUE, currentUser.id));
    console.log('✅ Saiu da queue!');
    setQueueJoinedAt(null);
  };

  const testFillQueue = () => {
    const botsNeeded = 10 - queue.length;
    if (botsNeeded <= 0) return;
    console.log(`🤖 Criando ${botsNeeded} bots...`);
    const newBots = Array.from({ length: botsNeeded }, (_, i) => {
      const bot = generateBot(`test-${Date.now()}-${i}`);
      bot.riotId = bot.username.split('#')[0];
      bot.riotTag = 'BOT';
      return bot;
    });
    botUsersRef.current = [...botUsersRef.current, ...newBots];
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

  // ⭐ NOVO: Criar match de teste direto para LIVE
  const createTestMatchDirect = async () => {
    if (!isAdmin) {
      console.log('❌ Apenas admin pode criar test match');
      return;
    }

    // ⭐ VERIFICAR SE ESTÁ NA QUEUE
    const isUserInQueue = queue.some(u => u.id === currentUser.id);
    if (!isUserInQueue) {
      showToast('You need to be in the queue to create a test match!', 'warning');
      return;
    }

    // ⭐ VERIFICAR SE TEM PELO MENOS 3 JOGADORES NA QUEUE (mínimo)
    if (queue.length < 3) {
      showToast('You need at least 3 players in the queue to create a test match.', 'warning');
      return;
    }

    try {
      console.log('========================================');
      console.log('🧪 CRIANDO TEST MATCH COM JOGADORES DA QUEUE');
      console.log('========================================');

      // ⭐ USAR TODOS OS JOGADORES DA QUEUE
      const queuePlayers = [...queue];
      console.log(`Jogadores da queue: ${queuePlayers.length}`);
      console.log('Jogadores:', queuePlayers.map(p => p.username).join(', '));

      const matchId = `testmatch_${Date.now()}`;
      
      // ⭐ RANDOMIZAR E DIVIDIR EM 2 TEAMS
      const shuffled = [...queuePlayers].sort(() => Math.random() - 0.5);
      const halfPoint = Math.ceil(shuffled.length / 2);
      const teamA = shuffled.slice(0, halfPoint);
      const teamB = shuffled.slice(halfPoint);

      const allPlayers = [...teamA, ...teamB];

      const playersData: any = {};
      allPlayers.forEach(p => {
        playersData[p.id] = {
          username: p.username,
          avatarUrl: p.avatarUrl || null,
          primaryRole: p.primaryRole,
          points: p.points,
          isBot: !!p.isBot
        };
      });

      // Selecionar mapa aleatório
      const randomMap = MAPS[Math.floor(Math.random() * MAPS.length)] as GameMap;

      const matchData = {
        id: matchId,
        phase: MatchPhase.LIVE, // ⭐ Direto para LIVE
        players: allPlayers.map(p => p.id),
        playersData: playersData,
        matchCode: null,
        captainA: teamA[0].id,
        captainB: teamB[0].id,
        teamA: teamA.map(p => p.id),
        teamB: teamB.map(p => p.id),
        turn: 'A',
        remainingPool: [],
        remainingMaps: [],
        selectedMap: randomMap, // ⭐ Mapa já selecionado
        startTime: Timestamp.fromMillis(Date.now()), // ⭐ Match começa agora
        resultReported: false,
        winner: null,
        reportA: null,
        reportB: null,
        playerReports: [], // ⭐ Array vazio para reports
        playerPointsChanges: [], // ⭐ Array vazio para mudanças de pontos
        readyPlayers: allPlayers.map(p => p.id), // Todos já "ready"
        chat: [{
          id: 'sys-test',
          senderId: 'system',
          senderName: 'System',
          text: '🧪 Test match created by admin. Match started immediately. 3 equal reports required to finalize.',
          timestamp: Date.now(),
          isSystem: true
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('💾 Salvando test match no Firestore...');
      const matchRef = doc(db, COLLECTIONS.ACTIVE_MATCHES, matchId);
      await setDoc(matchRef, matchData);

      console.log('✅ Test match criada!');
      console.log(`📍 Map: ${randomMap}`);
      console.log(`👥 Team A (${teamA.length}): ${teamA.map(p => p.username).join(', ')}`);
      console.log(`👥 Team B (${teamB.length}): ${teamB.map(p => p.username).join(', ')}`);
      
      // ⭐ REMOVER JOGADORES DA QUEUE
      console.log('🗑️ Removendo jogadores da queue...');
      const deletePromises = queuePlayers.map(p => 
        deleteDoc(doc(db, COLLECTIONS.QUEUE, p.id))
      );
      await Promise.all(deletePromises);
      console.log('✅ Queue limpa!');
      
      console.log('========================================');

      showToast(`Test match created with ${queuePlayers.length} players! Waiting for 3 equal result submissions.`, 'success');

    } catch (error: any) {
      console.error('❌ Erro ao criar test match:', error);
      showToast(error.message || 'Error creating test match. Check console.', 'error');
    }
  };

  // ⭐ NOVO: Sair da match e voltar ao lobby
  const exitMatchToLobby = async () => {
    if (!isAdmin) {
      console.log('❌ Apenas admin pode sair da match');
      return;
    }

    if (!matchState) {
      console.log('⚠️ Não está em nenhuma match');
      return;
    }

    try {
      console.log('🚪 Admin saindo da match...');
      
      // Deletar a match ativa
      await deleteDoc(doc(db, COLLECTIONS.ACTIVE_MATCHES, matchState.id));
      
      console.log('✅ Match deletada! Voltando ao lobby...');
      
      // O listener vai detectar a deleção e atualizar o estado
      setMatchState(null);
      currentMatchIdRef.current = null;

      showToast('Back to lobby!', 'success');

    } catch (error: any) {
      console.error('❌ Erro ao sair da match:', error);
      showToast(error.message || 'Error leaving match. Check console.', 'error');
    }
  };

  const acceptMatch = async () => {
    if (!matchState || matchState.phase !== MatchPhase.READY_CHECK || matchState.readyPlayers.includes(currentUser.id)) return;
    console.log(`✅ ${currentUser.username} aceitou a match`);
    await updateMatch({ readyPlayers: [...matchState.readyPlayers, currentUser.id] });
  };

  const draftPlayer = async (player: User) => {
    if (!matchState || matchState.phase !== MatchPhase.DRAFT) return;
    const isTeamA = matchState.turn === 'A';
    const newTeamAIds = isTeamA ? [...matchState.teamA.map(u => u.id), player.id] : matchState.teamA.map(u => u.id);
    const newTeamBIds = !isTeamA ? [...matchState.teamB.map(u => u.id), player.id] : matchState.teamB.map(u => u.id);
    const newPoolIds = matchState.remainingPool.filter(p => p.id !== player.id).map(p => p.id);
    const newTurn = isTeamA ? 'B' : 'A';
    const newPhase = newPoolIds.length === 0 ? MatchPhase.VETO : MatchPhase.DRAFT;
    const newChatEntry = {
      id: `sys-draft-${Date.now()}`,
      senderId: 'system',
      senderName: 'System',
      text: `${player.username} drafted to Team ${isTeamA ? 'A' : 'B'}`,
      timestamp: Date.now(),
      isSystem: true as const
    };
    const newTeamA = isTeamA ? [...matchState.teamA, player] : matchState.teamA;
    const newTeamB = !isTeamA ? [...matchState.teamB, player] : matchState.teamB;
    const newPool = matchState.remainingPool.filter(p => p.id !== player.id);
    setMatchState(prev => prev ? {
      ...prev,
      teamA: newTeamA,
      teamB: newTeamB,
      remainingPool: newPool,
      turn: newTurn,
      phase: newPhase,
      chat: [...prev.chat, newChatEntry]
    } : null);
    console.log(`👥 ${player.username} draftado para Team ${isTeamA ? 'A' : 'B'}`);
    await updateMatch({
      teamA: newTeamAIds,
      teamB: newTeamBIds,
      remainingPool: newPoolIds,
      turn: newTurn,
      phase: newPhase,
      chat: [...matchState.chat, newChatEntry]
    });
  };

  const vetoMap = async (map: GameMap) => {
    if (!matchState || matchState.phase !== MatchPhase.VETO) return;
    const newMaps = matchState.remainingMaps.filter(m => m !== map);
    const bannedMaps = matchState.bannedMaps || [];
    const newBannedMap = {
      map,
      bannedBy: currentUser.id,
      bannedByName: currentUser.username,
      team: matchState.turn
    };
    const newChatEntry = {
      id: `sys-veto-${Date.now()}`,
      senderId: 'system',
      senderName: 'System',
      text: `Map ${map} banned by ${currentUser.username}`,
      timestamp: Date.now(),
      isSystem: true as const
    };
    const newTurn = newMaps.length === 1 ? matchState.turn : (matchState.turn === 'A' ? 'B' : 'A');
    setMatchState(prev => prev ? {
      ...prev,
      remainingMaps: newMaps,
      bannedMaps: [...bannedMaps, newBannedMap],
      turn: newTurn,
      selectedMap: newMaps.length === 1 ? newMaps[0] : prev.selectedMap,
      chat: [...prev.chat, newChatEntry]
    } : null);
    console.log(`🗺️ Mapa ${map} banido por ${currentUser.username}`);
    const updates: any = {
      remainingMaps: newMaps,
      bannedMaps: [...bannedMaps, newBannedMap],
      chat: [...matchState.chat, newChatEntry]
    };
    if (newMaps.length === 1) {
      console.log(`🗺️ Mapa final: ${newMaps[0]}`);
      updates.selectedMap = newMaps[0];
      await updateMatch(updates);
      setTimeout(async () => {
        await updateMatch({
          phase: MatchPhase.LIVE,
          startTime: Timestamp.now(),
          chat: [...(updates.chat || matchState.chat), {
            id: `sys-live-${Date.now()}`,
            senderId: 'system',
            senderName: 'System',
            text: `Match LIVE on ${newMaps[0]}!`,
            timestamp: Date.now(),
            isSystem: true
          }]
        });
      }, 3000);
    } else {
      updates.turn = newTurn;
      await updateMatch(updates);
    }
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

    console.log('📊 Reportando resultado (inicio):', { scoreA, scoreB });

    // Verificar localmente se o jogador já reportou (rápido feedback)
    const alreadyLocal = (matchState.playerReports || []).some(r => r.playerId === currentUser.id);
    if (alreadyLocal) {
      console.log('⚠️ Jogador já reportou (estado local)');
      return { success: false, message: 'You have already submitted a result.' };
    }

    const newReport = {
      playerId: currentUser.id,
      playerName: currentUser.username,
      scoreA,
      scoreB,
      timestamp: Date.now()
    };

    console.log('📝 Novo report (preparing to append atomically):', newReport);

    // Append atómico para evitar lost-writes quando vários clientes submetem em simultâneo
    try {
      await updateDoc(doc(db, COLLECTIONS.ACTIVE_MATCHES, matchState.id), {
        playerReports: arrayUnion(newReport),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('❌ Falha ao enviar report para o Firestore:', err);
      return { success: false, message: 'Failed to submit report (network error).' };
    }

    // Ler versão mais recente do documento para contar votos corretamente
    const matchSnap = await getDoc(doc(db, COLLECTIONS.ACTIVE_MATCHES, matchState.id));
    if (!matchSnap.exists()) return { success: false, message: 'Match no longer exists.' };
    const serverData: any = matchSnap.data();
    const latestReports = serverData.playerReports || [];

    console.log(`📊 Total de reports (server): ${latestReports.length}`);

    // Recontar resultados com base na fonte de verdade (servidor)
    const resultCounts = new Map<string, { count: number, scoreA: number, scoreB: number, voters: string[] }>();
    latestReports.forEach((report: any) => {
      const key = `${report.scoreA}-${report.scoreB}`;
      const existing = resultCounts.get(key);
      if (existing) {
        existing.count++;
        existing.voters.push(report.playerName);
      } else {
        resultCounts.set(key, { count: 1, scoreA: report.scoreA, scoreB: report.scoreB, voters: [report.playerName] });
      }
    });

    resultCounts.forEach((data, key) => console.log(`  ${key}: ${data.count} votos (${data.voters.join(', ')})`));

    // Verificar consenso no servidor
    const REQUIRED_VOTES = 3;
    let consensusResult: { scoreA: number, scoreB: number, voters: string[] } | null = null;
    for (const [_, data] of resultCounts.entries()) {
      if (data.count >= REQUIRED_VOTES) {
        consensusResult = { scoreA: data.scoreA, scoreB: data.scoreB, voters: data.voters };
        break;
      }
    }

    // Se já existe consenso no servidor e a match ainda não foi marcada como finalizada, evitar duplicar finalização
    if (consensusResult) {
      if (serverData.resultReported) {
        console.log('⚠️ Consenso detectado mas match já marcada como finalizada no servidor.');
        return { success: true, message: 'Result verified (already finalized).' };
      }

      console.log('🎉 Consenso alcançado no servidor — finalizando match agora');
      await finalizeMatch({ scoreA: consensusResult.scoreA, scoreB: consensusResult.scoreB });
      return { success: true, message: 'Match finalized! Result verified by 3+ players.' };
    }

    const needMore = Math.max(0, REQUIRED_VOTES - latestReports.length);
    console.log(`⏳ Aguardando mais ${needMore} report(s)`);
    return { success: true, message: `Score submitted! Waiting for ${needMore} more player${needMore > 1 ? 's' : ''} to verify...` };
  };

  const sendFriendRequest = async (toId: string) => {
    try {
      console.log('📤 Enviando friend request para:', toId);
      console.log('🔑 Current user ID:', currentUser.id);
      console.log('🔑 Current user auth UID:', auth.currentUser?.uid);
      
      if (toId === currentUser.id) {
        console.log('❌ Não pode enviar request para si mesmo');
        showToast('You cannot send a friend request to yourself!', 'warning');
        return;
      }
      
      if (currentUser.friends.includes(toId)) {
        console.log('❌ Já são amigos');
        showToast('You are already friends!', 'info');
        return;
      }
      
      const targetUser = allUsers.find(u => u.id === toId);
      if (!targetUser) {
        console.log('❌ Usuário alvo não encontrado');
        showToast('User not found!', 'error');
        return;
      }
      
      if (targetUser.friendRequests.some(r => r.fromId === currentUser.id)) {
        console.log('❌ Request já enviado');
        showToast('You have already sent a friend request to this user!', 'info');
        return;
      }
      
      console.log('📝 Tentando atualizar documento:', toId);
      console.log('📝 Dados atuais do target:', {
        friendRequests: targetUser.friendRequests,
        friends: targetUser.friends
      });
      
      const newRequest = { fromId: currentUser.id, toId, timestamp: Date.now() };
      const updatedRequests = [...targetUser.friendRequests, newRequest];
      
      console.log('📝 Novos friend requests:', updatedRequests);
      
      await updateDoc(doc(db, COLLECTIONS.USERS, toId), {
        friend_requests: updatedRequests
      });
      
      console.log('✅ Friend request enviado com sucesso!');
      showToast('Friend request sent!', 'success');
    } catch (error: any) {
      console.error('❌ Erro ao enviar friend request:', error);
      console.error('❌ Erro código:', error.code);
      console.error('❌ Erro mensagem:', error.message);
      
      if (error.code === 'permission-denied') {
        showToast('Permission denied. Firestore rules do not allow sending friend requests. Update the Firestore rules in the Firebase Console.', 'error', 6000);
      } else {
        showToast(`Error sending friend request: ${error.message}`, 'error');
      }
    }
  };

  const acceptFriendRequest = async (fromId: string) => {
    try {
      console.log('✅ Aceitando friend request de:', fromId);

      const fromUser = allUsers.find(u => u.id === fromId);
      if (!fromUser) {
        console.log('❌ Usuário não encontrado');
        return;
      }

      const countedAccepter = currentUser.friendQuestCountedIds || [];
      const countedSender = fromUser.friendQuestCountedIds || [];
      const countForAccepter = !countedAccepter.includes(fromId);
      const countForSender = !countedSender.includes(currentUser.id);

      // Update accepter's friends and remove request
      const accepterUpdates: Record<string, unknown> = {
        friends: [...(currentUser.friends || []), fromId],
        friend_requests: (currentUser.friendRequests || []).filter(r => r.fromId !== fromId)
      };

      if (countForAccepter) {
        const updatedQuests = (currentUser.activeQuests || []).map(uq => {
          const questDef = QUEST_POOL.find(q => q.id === uq.questId);
          if (!questDef || questDef.type !== 'ADD_FRIEND' || uq.completed) return uq;
          const newProgress = Math.min(uq.progress + 1, questDef.target);
          return { ...uq, progress: newProgress, completed: newProgress >= questDef.target };
        });
        accepterUpdates.active_quests = updatedQuests;
        accepterUpdates.friend_quest_counted_ids = [...countedAccepter, fromId];
      }

      await updateDoc(doc(db, COLLECTIONS.USERS, currentUser.id), accepterUpdates);

      // Update sender's friends
      const senderUpdates: Record<string, unknown> = {
        friends: [...(fromUser.friends || []), currentUser.id]
      };
      if (countForSender) {
        const updatedQuestsSender = (fromUser.activeQuests || []).map(uq => {
          const questDef = QUEST_POOL.find(q => q.id === uq.questId);
          if (!questDef || questDef.type !== 'ADD_FRIEND' || uq.completed) return uq;
          const newProgress = Math.min(uq.progress + 1, questDef.target);
          return { ...uq, progress: newProgress, completed: newProgress >= questDef.target };
        });
        senderUpdates.active_quests = updatedQuestsSender;
        senderUpdates.friend_quest_counted_ids = [...countedSender, currentUser.id];
      }

      await updateDoc(doc(db, COLLECTIONS.USERS, fromId), senderUpdates);

      console.log('✅ Friend request aceito!');
      showToast('Friend request accepted!', 'success');
    } catch (error: any) {
      console.error('❌ Erro ao aceitar friend request:', error);
      showToast(error.message || 'Error accepting friend request', 'error');
    }
  };

  const rejectFriendRequest = async (fromId: string) => {
    try {
      console.log('❌ Rejeitando friend request de:', fromId);
      
      await updateDoc(doc(db, COLLECTIONS.USERS, currentUser.id), {
        friend_requests: currentUser.friendRequests.filter(r => r.fromId !== fromId)
      });
      
      console.log('✅ Friend request rejeitado');
    } catch (error) {
      console.error('❌ Erro ao rejeitar friend request:', error);
    }
  };

  const removeFriend = async (friendId: string) => {
    // Modal will be handled in FriendsView component
    try {
      console.log('🗑️ Removendo amigo:', friendId);
      
      const friend = allUsers.find(u => u.id === friendId);
      if (!friend) {
        console.log('❌ Amigo não encontrado');
        return;
      }
      
      await updateDoc(doc(db, COLLECTIONS.USERS, currentUser.id), {
        friends: currentUser.friends.filter(f => f !== friendId)
      });
      
      await updateDoc(doc(db, COLLECTIONS.USERS, friendId), {
        friends: friend.friends.filter(f => f !== currentUser.id)
      });
      
      console.log('✅ Amigo removido');
      showToast('Friend removed', 'info');
    } catch (error: any) {
      console.error('❌ Erro ao remover amigo:', error);
      showToast(error.message || 'Error removing friend', 'error');
    }
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
    // Persist to Firestore so it survives refresh and is visible in dashboard
    persistReport(targetUserId, reason);
  };

  // Persist reports to Firestore as tickets so they are visible in dashboard and do not disappear on refresh
  const persistReport = async (targetUserId: string, reason: string) => {
    try {
      await addDoc(collection(db, COLLECTIONS.TICKETS), {
        userId: currentUser.id,
        username: currentUser.username,
        type: 'support',
        subject: `Player report: ${targetUserId}`,
        message: reason,
        reportedUserId: targetUserId,
        timestamp: Date.now()
      });
      showToast('Report submitted!', 'success');
    } catch (e: any) {
      console.warn('Failed to persist report:', e);
      showToast('Failed to submit report', 'error');
    }
  };

  const resetMatch = async () => {
    console.log('🏠 Voltando ao lobby...');
    currentMatchIdRef.current = null;
    setMatchState(null);
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
    showToast("Season Reset!", 'success');
  };

  const handleBotAction = useCallback(() => {
    if (!matchState) return;
    const captain = matchState.turn === 'A' ? matchState.captainA : matchState.captainB;
    
    console.log(`🤖 Bot action check - Phase: ${matchState.phase}, Turn: ${matchState.turn}, Captain: ${captain?.username}, isBot: ${captain?.isBot}`);
    
    if (!captain?.isBot) {
      console.log(`⏭️ Não é bot, pulando`);
      return;
    }
    
    if (matchState.phase === MatchPhase.DRAFT && matchState.remainingPool.length > 0) {
      console.log(`🤖 Bot drafting...`);
      draftPlayer(matchState.remainingPool[Math.floor(Math.random() * matchState.remainingPool.length)]);
    } else if (matchState.phase === MatchPhase.VETO && matchState.remainingMaps.length > 1) {
      // Don't veto when only 1 map left – it's auto-selected; vetoing would clear it
      const mapToVeto = matchState.remainingMaps[Math.floor(Math.random() * matchState.remainingMaps.length)];
      console.log(`🤖 Bot vetoing map: ${mapToVeto}`);
      vetoMap(mapToVeto);
    }
  }, [matchState, draftPlayer, vetoMap]);

  const markPlayerAsInteracted = useCallback((playerId: string) => {
    setMatchInteractions(prev => prev.includes(playerId) ? prev : [...prev, playerId]);
  }, []);

  useEffect(() => {
    if (!matchState) setMatchInteractions([]);
  }, [matchState?.id]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const submitTicket = useCallback(async (type: TicketType, subject: string, message: string, parts?: Record<string, string>) => {
    if (!currentUser.id || currentUser.id === 'user-1') return;
    try {
      await addDoc(collection(db, COLLECTIONS.TICKETS), {
        userId: currentUser.id,
        username: currentUser.username,
        type,
        subject: subject || undefined,
        message: message || undefined,
        parts: parts || undefined,
        timestamp: Date.now()
      });
      showToast(type === 'suggestion' ? 'Suggestion submitted!' : 'Ticket submitted!', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to submit', 'error');
    }
  }, [currentUser.id, currentUser.username, showToast]);

  const replyToTicket = useCallback(async (ticketId: string, replyText: string) => {
    if (!ticketId || !replyText) return;
    try {
      const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketId);
      await updateDoc(ticketRef, {
        reply: {
          text: replyText,
          replierId: currentUser.id,
          replierUsername: currentUser.username,
          replierAvatarUrl: currentUser.avatarUrl || null,
          repliedAt: Date.now()
        },
        status: 'closed'
      });
      showToast('Reply posted.', 'success');
    } catch (e: any) {
      console.error('Failed to reply to ticket:', e);
      showToast('Failed to post reply', 'error');
    }
  }, [currentUser.id, currentUser.username, currentUser.avatarUrl, showToast]);

  const setUserRole = useCallback(async (userId: string, role: UserRole, verified: boolean) => {
    if (!hasDashboardAccess) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), { role, verified });
      showToast('User role updated', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to update role', 'error');
    }
  }, [hasDashboardAccess, showToast]);

  const resetDailyQuests = () => {
    // Implement your reset logic here
  };

  return (
    <GameContext.Provider
      value={{
        isAuthenticated, isAdmin, hasDashboardAccess, completeRegistration, logout, currentUser, pendingAuthUser,
        updateProfile, linkRiotAccount, queue, queueJoinedAt, joinQueue, leaveQueue, testFillQueue,
        createTestMatchDirect, exitMatchToLobby,
        matchState, acceptMatch, draftPlayer, vetoMap, reportResult, sendChatMessage,
        matchHistory, allUsers, reports, submitReport, commendPlayer, resetMatch,
        forceTimePass, resetSeason, themeMode, handleBotAction,
        viewProfileId, setViewProfileId, claimQuestReward,
        sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend,
        matchInteractions, markPlayerAsInteracted,
        showToast, removeToast, toasts,
        tickets, submitTicket, replyToTicket, onlineUserIds, setUserRole,
        resetDailyQuests,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};
