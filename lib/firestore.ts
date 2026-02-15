import { getFirestore } from 'firebase/firestore';
import { app } from '../services/firebase';

export const db = getFirestore(app);

export const COLLECTIONS = {
  USERS: 'users',
  MATCHES: 'matches',
  FRIENDS: 'friends',
  QUESTS: 'quests'
} as const;