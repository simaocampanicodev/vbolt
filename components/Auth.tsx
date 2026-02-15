import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { signInWithGoogle } from '../services/firebase';
import Card from './ui/Card';
import Button from './ui/Button';
import { AGENTS, ROLES } from '../constants';
import { GameRole } from '../types';
import { AlertTriangle } from 'lucide-react';

const Auth = () => {
  const { completeRegistration, themeMode, pendingAuthUser, allUsers } = useGame();
  
  // Auth Flow State
  const [step, setStep] = useState<'start' | 'registration_details'>('start');
  
  // Registration Data
  const [regUsername, setRegUsername] = useState('');
  const [regPrimary, setRegPrimary] = useState<GameRole>(GameRole.DUELIST);
  const [regSecondary, setRegSecondary] = useState<GameRole>(GameRole.FLEX);
  const [regAgents, setRegAgents] = useState<string[]>([]);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
      if (pendingAuthUser) {
          setStep('registration_details');
          if (pendingAuthUser.email) {
              setRegUsername(pendingAuthUser.email.split('@')[0]);
          }
      }
  }, [pendingAuthUser]);

  const handleAgentToggle = (agent: string) => {
    if (regAgents.includes(agent)) {
        setRegAgents(prev => prev.filter(a => a !== agent));
    } else {
        if (regAgents.length < 3) {
            setRegAgents(prev => [...prev, agent]);
        }
    }
  };

  const handleGoogleClick = async () => {
      try {
          await signInWithGoogle();
          // GameContext onAuthStateChanged listener handles the rest
      } catch (error) {
          console.error("Login failed:", error);
      }
  };

  const handleManualBypass = () => {
      // Mock user for Preview environments
      const randomSuffix = Math.floor(Math.random() * 10000);
      const mockUser = {
          email: `guest-${randomSuffix}@valhub.pt`,
          uid: `guest-${Date.now()}`,
          photoURL: null
      };
      
      setStep('registration_details');
      (window as any).__MOCK_USER__ = mockUser;
      
      setRegUsername(`GuestPlayer${randomSuffix}`);
  };

  const handleRegistrationSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setRegError(null);
      
      if (!regUsername.trim()) {
          setRegError("Please enter a username.");
          return;
      }
      if (regPrimary === regSecondary) {
          setRegError("Primary and Secondary roles cannot be the same.");
          return;
      }
      if (regAgents.length !== 3) {
          setRegError("Please select exactly 3 agents.");
          return;
      }

      // CHECK IF USERNAME IS TAKEN
      const isTaken = allUsers.some(u => u.username.toLowerCase() === regUsername.toLowerCase());
      if (isTaken) {
          setRegError("Username is already taken. Please choose another.");
          return;
      }

      const userToRegister = pendingAuthUser || (window as any).__MOCK_USER__;

      if (!userToRegister || !userToRegister.email) {
          setRegError("Authentication error. Please try logging in again.");
          setStep('start');
          return;
      }

      completeRegistration({
          email: userToRegister.email,
          username: regUsername,
          primaryRole: regPrimary,
          secondaryRole: regSecondary,
          topAgents: regAgents
      });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500 py-10">
      <div className="mb-8 text-center">
        <h1 className={`text-6xl font-display font-bold tracking-tighter flex items-center justify-center ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
          VBO
           {/* Bolt replacing the L - Rotated 12 degrees right to look like an L */}
           <svg 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className={`h-24 w-14 mx-[-4px] translate-x-0.5 translate-y-0.5 rotate-12 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}
          >
             <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
          </svg>
          T<span className="text-rose-500">.</span>
        </h1>
        <p className="text-zinc-500 tracking-widest uppercase text-sm mt-2">PORTUGUESE VALORANT HUB</p>
      </div>

      <Card className="w-full max-w-lg">
        
        {step === 'start' && (
             <div className="flex flex-col items-center space-y-6 py-8">
                 <p className="text-zinc-400 text-center mb-4">Connect your account to start playing.</p>
                 <button 
                    onClick={handleGoogleClick}
                    className="flex items-center justify-center space-x-3 w-full max-w-sm bg-white text-black py-4 rounded-xl font-bold shadow-lg hover:bg-gray-100 transition-colors"
                 >
                     <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
                     <span>Continue with Google</span>
                 </button>
                 
                 <div className="w-full max-w-sm flex items-center justify-center border-t border-zinc-800 pt-4 mt-2">
                     <button 
                        onClick={handleManualBypass}
                        className="text-xs text-zinc-500 hover:text-white underline"
                     >
                        Entrar como Convidado (Modo Teste / Preview)
                     </button>
                 </div>

                 <div className="text-xs text-zinc-600 mt-2 text-center">
                     By connecting, you agree to our Terms of Service.
                 </div>
             </div>
        )}

        {step === 'registration_details' && (
            <form onSubmit={handleRegistrationSubmit} className="space-y-6">
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold">Complete Profile</h3>
                    <p className="text-sm text-zinc-500">Set up your Valorant identity</p>
                </div>

                <div>
                    <label className="block text-xs text-zinc-500 uppercase mb-2">Username</label>
                    <input 
                        type="text" 
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        className={`w-full rounded-2xl p-3 font-display outline-none border transition-all
                            ${themeMode === 'dark' ? 'bg-black/20 border-white/10 text-white' : 'bg-zinc-100 border-zinc-200 text-black'}
                        `}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-zinc-500 uppercase mb-2">Primary Role</label>
                        <select 
                            value={regPrimary}
                            onChange={(e) => setRegPrimary(e.target.value as GameRole)}
                            className={`w-full rounded-2xl p-3 outline-none border appearance-none cursor-pointer bg-zinc-900 border-white/10 text-white`}
                        >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-500 uppercase mb-2">Secondary Role</label>
                        <select 
                            value={regSecondary}
                            onChange={(e) => setRegSecondary(e.target.value as GameRole)}
                            className={`w-full rounded-2xl p-3 outline-none border appearance-none cursor-pointer bg-zinc-900 border-white/10 text-white`}
                        >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-zinc-500 uppercase mb-2">Select Top 3 Agents ({regAgents.length}/3)</label>
                    <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                        {AGENTS.map(agent => (
                            <button
                                key={agent}
                                type="button"
                                onClick={() => handleAgentToggle(agent)}
                                className={`
                                    px-2 py-1.5 rounded-lg text-xs border transition-all
                                    ${regAgents.includes(agent) 
                                        ? `bg-rose-500 text-white border-rose-500` 
                                        : `border-transparent text-zinc-500 ${themeMode === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
                                `}
                            >
                                {agent}
                            </button>
                        ))}
                    </div>
                </div>

                {regError && (
                    <div className="flex items-center justify-center p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {regError}
                    </div>
                )}

                <Button type="submit" className="w-full py-4 mt-4">
                    Finish Setup
                </Button>
            </form>
        )}

      </Card>
    </div>
  );
};

export default Auth;