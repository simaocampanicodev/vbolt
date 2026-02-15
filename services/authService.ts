// services/authService.firestore.ts
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firestore';
import bcrypt from 'bcryptjs';
import { User, GameRole } from '../types';

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  primaryRole: GameRole;
  secondaryRole: GameRole;
  topAgents: string[];
}

// Gerar ID único
const generateUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Registrar novo usuário
export const registerUser = async (data: RegisterData): Promise<{ success: boolean; error?: string; user?: User }> => {
  try {
    // Verificar se email já existe
    const usersRef = collection(db, COLLECTIONS.USERS);
    const emailQuery = query(usersRef, where('email', '==', data.email), limit(1));
    const emailSnapshot = await getDocs(emailQuery);

    if (!emailSnapshot.empty) {
      return { success: false, error: 'Email já está em uso' };
    }

    // Verificar se username já existe
    const usernameQuery = query(usersRef, where('username', '==', data.username), limit(1));
    const usernameSnapshot = await getDocs(usernameQuery);

    if (!usernameSnapshot.empty) {
      return { success: false, error: 'Nome de usuário já está em uso' };
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Criar ID único para o usuário
    const userId = generateUserId();

    // Dados do novo usuário
    const newUserData = {
      email: data.email,
      username: data.username,
      password_hash: passwordHash,
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
      created_at: serverTimestamp()
    };

    // Criar documento do usuário
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await setDoc(userRef, newUserData);

    // Buscar o usuário criado para retornar
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    if (!userData) {
      return { success: false, error: 'Erro ao criar conta' };
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
      friendRequests: userData.friend_requests || []
    };

    return { success: true, user };
  } catch (error) {
    console.error('Erro ao registrar:', error);
    return { success: false, error: 'Erro ao criar conta' };
  }
};

// Login
export const loginUser = async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const emailQuery = query(usersRef, where('email', '==', email), limit(1));
    const querySnapshot = await getDocs(emailQuery);

    if (querySnapshot.empty) {
      return { success: false, error: 'Email ou senha incorretos' };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, userData.password_hash);
    if (!passwordMatch) {
      return { success: false, error: 'Email ou senha incorretos' };
    }

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
      friendRequests: userData.friend_requests || []
    };

    return { success: true, user };
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return { success: false, error: 'Erro ao fazer login' };
  }
};

// Atualizar perfil
export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<boolean> => {
  try {
    const dbUpdates: any = {};
    
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

    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, dbUpdates);

    return true;
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
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
        friendRequests: u.friend_requests || []
      };
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
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
      friendRequests: u.friend_requests || []
    };
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
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
    console.error('Erro ao salvar partida:', error);
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
    console.error('Erro ao buscar histórico:', error);
    return [];
  }
};
