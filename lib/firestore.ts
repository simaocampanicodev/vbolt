import { getFirestore } from 'firebase/firestore';
import { app } from '../services/firebase';

export const db = getFirestore(app);

export const COLLECTIONS = {
  USERS: 'users',
  MATCHES: 'matches',
  ACTIVE_MATCHES: 'active_matches',
  QUEUE: 'queue_entries',
  FRIENDS: 'friends',
  QUESTS: 'quests'
} as const;