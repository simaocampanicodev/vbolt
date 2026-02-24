import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteField,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firestore';
import { REFERRAL_XP_REWARD } from '../constants';
import { auth } from './firebase'; // ⭐ IMPORTANTE: Importar auth
import { User, GameRole, UserRole } from '../types';

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  primaryRole: GameRole;
  secondaryRole: GameRole;
  topAgents: string[];
  referralId?: string;
}

// ⭐ ATUALIZADO: Usa Firebase UID se disponível
const generateUserId = (firebaseUid?: string) => {
  if (firebaseUid) {
    console.log('✅ Usando Firebase UID:', firebaseUid);
    return firebaseUid;
  }
  const randomId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('⚠️ Firebase UID não disponível, usando ID aleatório:', randomId);
  return randomId;
};

// Registrar novo usuário
export const registerUser = async (data: RegisterData): Promise<{ success: boolean; error?: string; user?: User }> => {
  try {
    console.log('📝 Iniciando registro de usuário...');
    
    // Verificar se username já existe
    const usersRef = collection(db, COLLECTIONS.USERS);
    const usernameQuery = query(usersRef, where('username', '==', data.username), limit(1));
    const usernameSnapshot = await getDocs(usernameQuery);

    if (!usernameSnapshot.empty) {
      console.log('❌ Username já existe');
      return { success: false, error: 'Username is already in use' };
    }

    // Verificar se email já existe
    const emailQuery = query(usersRef, where('email', '==', data.email), limit(1));
    const emailSnapshot = await getDocs(emailQuery);

    if (!emailSnapshot.empty) {
      console.log('❌ Email já existe');
      return { success: false, error: 'Email is already in use' };
    }

    // ⭐ USAR Firebase UID como ID do documento
    const firebaseUid = auth.currentUser?.uid;
    console.log('🔑 Firebase Auth UID:', firebaseUid);
    
    const userId = generateUserId(firebaseUid);

    // Dados do novo usuário
    const newUserData: any = {
      email: data.email,
      username: data.username,
      primary_role: data.primaryRole,
      secondary_role: data.secondaryRole,
      top_agents: data.topAgents,
      points: 1000,
      xp: 0,
      level: 1,
      reputation: 10,
      wins: 0,
      losses: 0,
      winstreak: 0,
      active_quests: [],
      friends: [],
      friend_requests: [],
      friend_quest_counted_ids: [],
      created_at: serverTimestamp()
    };
    if (data.referralId && typeof data.referralId === 'string') {
      newUserData.referred_by = data.referralId;
    }

    console.log('💾 Salvando usuário no Firestore com ID:', userId);
    
    // Criar documento do usuário
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    
    // ⭐ Usar merge: true para evitar sobrescrever se já existir
    await setDoc(userRef, newUserData, { merge: true });

    console.log('✅ Usuário salvo no Firestore!');

    // Buscar o usuário criado para retornar
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    if (!userData) {
      console.error('❌ Erro: documento não encontrado após criar');
      return { success: false, error: 'Error creating account' };
    }

    const user: User = {
      id: userId,
      username: userData.username,
      points: userData.points,
      xp: userData.xp,
      level: userData.level,
      reputation: userData.reputation,
      wins: userData.wins,
      losses: userData.losses,
      winstreak: userData.winstreak,
      primaryRole: userData.primary_role as GameRole,
      secondaryRole: userData.secondary_role as GameRole,
      topAgents: userData.top_agents,
      isBot: false,
      activeQuests: userData.active_quests || [],
      friends: userData.friends || [],
      friendRequests: userData.friend_requests || [],
      friendQuestCountedIds: userData.friend_quest_counted_ids || []
    };

    // Referral reward
    try {
      if (data.referralId && user.id !== data.referralId) {
        const refRef = doc(db, COLLECTIONS.USERS, data.referralId);
        const refSnap = await getDoc(refRef);
        if (refSnap.exists()) {
          const refData = refSnap.data() || {};
          const newXp = (refData.xp || 0) + REFERRAL_XP_REWARD;
          await updateDoc(refRef, {
            xp: newXp,
            referral_count: ((refData.referral_count || 0) + 1)
          });
        }
      }
    } catch (e) {
      console.warn('Referral reward failed or skipped:', e);
    }

    console.log('✅ Usuário criado com sucesso:', user.username);
    return { success: true, user };
  } catch (error: any) {
    console.error('❌ Erro ao registrar:', error);
    console.error('❌ Erro código:', error.code);
    console.error('❌ Erro mensagem:', error.message);
    
    // Mensagens de erro mais específicas
    if (error.code === 'permission-denied') {
      return { success: false, error: 'Firestore permission error. Check security rules.' };
    }
    
    return { success: false, error: error.message || 'Error creating account' };
  }
};

// Login - Busca usuário no Firestore
export const loginUser = async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
  try {
    console.log('🔑 Buscando usuário por email...');
    
    const usersRef = collection(db, COLLECTIONS.USERS);
    const emailQuery = query(usersRef, where('email', '==', email), limit(1));
    const querySnapshot = await getDocs(emailQuery);

    if (querySnapshot.empty) {
      console.log('❌ Usuário não encontrado');
      return { success: false, error: 'Incorrect email or password' };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    console.log('✅ Usuário encontrado:', userData.username);

    const user: User = {
      id: userDoc.id,
      username: userData.username,
      points: userData.points,
      xp: userData.xp,
      level: userData.level,
      reputation: userData.reputation,
      wins: userData.wins,
      losses: userData.losses,
      winstreak: userData.winstreak,
      primaryRole: userData.primary_role as GameRole,
      secondaryRole: userData.secondary_role as GameRole,
      topAgents: userData.top_agents,
      isBot: false,
      activeQuests: userData.active_quests || [],
      friends: userData.friends || [],
      friendRequests: userData.friend_requests || [],
      friendQuestCountedIds: userData.friend_quest_counted_ids || [],
      avatarUrl: userData.avatarUrl,
      bannerUrl: userData.bannerUrl,
      bannerPosition: userData.bannerPosition,
      riotId: userData.riotId,
      riotTag: userData.riotTag,
      lastSeenAt: userData.lastSeenAt,
      role: (userData.role as UserRole) || 'user',
      verified: !!userData.verified
    };

    return { success: true, user };
  } catch (error: any) {
    console.error('❌ Erro ao fazer login:', error);
    return { success: false, error: 'Error logging in' };
  }
};

// Atualizar perfil
export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<boolean> => {
  try {
    console.log('💾 Atualizando perfil...', userId, Object.keys(updates));
    
    const dbUpdates: any = {};
    
    if (updates.username !== undefined) dbUpdates.username = updates.username; // ✅ ADICIONADO
    if (updates.points !== undefined) dbUpdates.points = updates.points;
    if (updates.xp !== undefined) dbUpdates.xp = updates.xp;
    if (updates.level !== undefined) dbUpdates.level = updates.level;
    if (updates.reputation !== undefined) dbUpdates.reputation = updates.reputation;
    if (updates.wins !== undefined) dbUpdates.wins = updates.wins;
    if (updates.losses !== undefined) dbUpdates.losses = updates.losses;
    if (updates.winstreak !== undefined) dbUpdates.winstreak = updates.winstreak;
    if (updates.primaryRole !== undefined) dbUpdates.primary_role = updates.primaryRole;
    if (updates.secondaryRole !== undefined) dbUpdates.secondary_role = updates.secondaryRole;
    if (updates.topAgents !== undefined) dbUpdates.top_agents = updates.topAgents;
    if (updates.activeQuests !== undefined) dbUpdates.active_quests = updates.activeQuests;
    if (updates.friends !== undefined) dbUpdates.friends = updates.friends;
    if (updates.friendRequests !== undefined) dbUpdates.friend_requests = updates.friendRequests;
    if (updates.riotId !== undefined) dbUpdates.riotId = updates.riotId;
    if (updates.riotTag !== undefined) dbUpdates.riotTag = updates.riotTag;
    if (updates.friendQuestCountedIds !== undefined) dbUpdates.friend_quest_counted_ids = updates.friendQuestCountedIds;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.verified !== undefined) dbUpdates.verified = updates.verified;
    if (updates.lastSeenAt !== undefined) dbUpdates.lastSeenAt = updates.lastSeenAt;

    // ✅ CORREÇÃO: Permitir remover avatarUrl
    if ('avatarUrl' in updates) {
      if (updates.avatarUrl === null || updates.avatarUrl === undefined) {
        dbUpdates.avatarUrl = deleteField();
      } else {
        dbUpdates.avatarUrl = updates.avatarUrl;
      }
    }
    if ('bannerUrl' in updates) {
      if (updates.bannerUrl === null || updates.bannerUrl === undefined) {
        dbUpdates.bannerUrl = deleteField();
      } else {
        dbUpdates.bannerUrl = updates.bannerUrl;
      }
    }
    if (updates.bannerPosition !== undefined) dbUpdates.bannerPosition = updates.bannerPosition;

    if (updates.lastPointsChange !== undefined) dbUpdates.lastPointsChange = updates.lastPointsChange;
    if (updates.lastDailyQuestGeneration !== undefined) dbUpdates.lastDailyQuestGeneration = updates.lastDailyQuestGeneration;
    if (updates.lastMonthlyQuestGeneration !== undefined) dbUpdates.lastMonthlyQuestGeneration = updates.lastMonthlyQuestGeneration;
    // Social external links
    if (updates.trackerUrl !== undefined) dbUpdates.trackerUrl = updates.trackerUrl;
    if (updates.trackerAddedAt !== undefined) dbUpdates.trackerAddedAt = updates.trackerAddedAt;
    if (updates.twitchUrl !== undefined) dbUpdates.twitchUrl = updates.twitchUrl;
    if (updates.twitchAddedAt !== undefined) dbUpdates.twitchAddedAt = updates.twitchAddedAt;

    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, dbUpdates);

    console.log('✅ Perfil atualizado!');
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao atualizar perfil:', error);
    console.error('❌ Erro código:', error.code);
    return false;
  }
};

// Buscar todos os usuários (para leaderboard)
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(usersRef, orderBy('points', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const u = doc.data();
      return {
        id: doc.id,
        username: u.username,
        points: u.points,
        xp: u.xp,
        level: u.level,
        reputation: u.reputation,
        wins: u.wins,
        losses: u.losses,
        winstreak: u.winstreak,
        primaryRole: u.primary_role as GameRole,
        secondaryRole: u.secondary_role as GameRole,
        topAgents: u.top_agents,
        isBot: false,
        activeQuests: u.active_quests || [],
        friends: u.friends || [],
        friendRequests: u.friend_requests || [],
        friendQuestCountedIds: u.friend_quest_counted_ids || [],
        avatarUrl: u.avatarUrl,
        bannerUrl: u.bannerUrl,
        bannerPosition: u.bannerPosition,
        riotId: u.riotId,
        riotTag: u.riotTag,
        lastSeenAt: u.lastSeenAt,
        role: (u.role as UserRole) || 'user',
        verified: !!u.verified
      } as User;
    });
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    return [];
  }
};

// Buscar usuário por ID
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    const u = userDoc.data();
    return {
      id: userDoc.id,
      username: u.username,
      points: u.points,
      xp: u.xp,
      level: u.level,
      reputation: u.reputation,
      wins: u.wins,
      losses: u.losses,
      winstreak: u.winstreak,
      primaryRole: u.primary_role as GameRole,
      secondaryRole: u.secondary_role as GameRole,
      topAgents: u.top_agents,
      isBot: false,
      activeQuests: u.active_quests || [],
      friends: u.friends || [],
      friendRequests: u.friend_requests || [],
      friendQuestCountedIds: u.friend_quest_counted_ids || [],
        avatarUrl: u.avatarUrl,
        bannerUrl: u.bannerUrl,
        bannerPosition: u.bannerPosition,
        riotId: u.riotId,
        riotTag: u.riotTag,
        lastSeenAt: u.lastSeenAt,
        role: (u.role as UserRole) || 'user',
        verified: !!u.verified
    } as User;
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    return null;
  }
};

// Salvar partida no histórico
export const saveMatch = async (matchData: any): Promise<boolean> => {
  try {
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);

    await setDoc(matchRef, {
      team_a: matchData.teamA,
      team_b: matchData.teamB,
      map: matchData.map,
      score_a: matchData.scoreA,
      score_b: matchData.scoreB,
      winner: matchData.winner,
      match_date: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar partida:', error);
    return false;
  }
};

// Buscar histórico de partidas
export const getMatchHistory = async (): Promise<any[]> => {
  try {
    const matchesRef = collection(db, COLLECTIONS.MATCHES);
    const q = query(matchesRef, orderBy('match_date', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    return [];
  }
};
