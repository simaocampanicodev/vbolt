// services/firebase.ts - VERSÃO ATUALIZADA
// ⭐ ADICIONADO: Firebase Storage para upload de avatares

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { getStorage } from 'firebase/storage'; // ⭐ NOVO

const firebaseConfig = {
  apiKey: "AIzaSyAlHKJkKbbsbPU6UkFHqPtqUCPn_sg-6hk",
  authDomain: "val-hub-4994b.firebaseapp.com",
  projectId: "val-hub-4994b",
  storageBucket: "val-hub-4994b.firebasestorage.app",
  messagingSenderId: "107992744301",
  appId: "1:107992744301:web:3499e5bc70499e0f351a64"
};

// Inicialização do Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app); // ⭐ NOVO: Storage inicializado
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Erro ao fazer login com Google:", error);
    
    if (error.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        alert(`DOMÍNIO NÃO AUTORIZADO!\n\nO Firebase bloqueou este site por segurança.\n\nSOLUÇÃO:\n1. Vá à consola do Firebase > Authentication > Settings > Authorized Domains.\n2. Adicione este domínio: ${currentDomain}`);
    } else if (error.code === 'auth/configuration-not-found' || error.code === 'auth/api-key-not-valid. please pass a valid api key.') {
        alert("ERRO DE CONFIGURAÇÃO: As chaves API no ficheiro 'services/firebase.ts' estão incorretas.");
    } else if (error.code === 'auth/popup-closed-by-user') {
        // Usuário fechou a janela propositadamente, ignorar.
    } else {
        alert(`Erro de Autenticação (${error.code}): ${error.message}`);
    }
    throw error;
  }
};

export const logoutUser = async () => {
    await firebaseSignOut(auth);
};
