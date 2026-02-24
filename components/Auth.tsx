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

        if (!pendingAuthUser || !pendingAuthUser.email) {
            setRegError("Authentication error. Please try logging in again.");
            setStep('start');
            return;
        }

        completeRegistration({
            email: pendingAuthUser.email,
            username: regUsername,
            primaryRole: regPrimary,
            secondaryRole: regSecondary,
            topAgents: regAgents
        });
    };

    return (
        <div className="flex min-h-screen bg-[#050505] text-white">
            {/* Left Pane - Auth Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-24">
                {/* Logo */}
                <div className="absolute top-8 left-8 flex items-center">
                    <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-8 h-8 text-rose-500"
                    >
                        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
                    </svg>
                    <span className="ml-2 font-display font-bold text-2xl tracking-tighter text-white">
                        VBolt
                    </span>
                </div>

                <div className="max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {step === 'start' && (
                        <>
                            <div className="mb-10">
                                <h1 className="text-4xl lg:text-5xl font-display font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600">Welcome to the future</h1>
                                <p className="text-zinc-400 text-lg">Enter into the hub and take your gameplay to the next level.</p>
                            </div>

                            <div className="space-y-4 relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-rose-600 outline-none to-red-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                <button
                                    onClick={handleGoogleClick}
                                    className="relative flex items-center justify-center space-x-3 w-full bg-[#111] hover:bg-black border border-white/10 text-white py-4 rounded-2xl font-medium transition-all hover:border-white/20 active:scale-[0.98]"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    <span>Continue with Google</span>
                                </button>
                            </div>
                        </>
                    )}

                    {step === 'registration_details' && (
                        <form onSubmit={handleRegistrationSubmit} className="space-y-6">
                            <div className="mb-8">
                                <h1 className="text-3xl font-display font-bold mb-2">Complete Profile</h1>
                                <p className="text-zinc-400">Set up your Valorant identity</p>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Username</label>
                                    <input
                                        type="text"
                                        value={regUsername}
                                        onChange={(e) => setRegUsername(e.target.value)}
                                        className="w-full rounded-2xl p-4 font-display outline-none border transition-all bg-[#111] border-white/10 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50"
                                        required
                                        placeholder="Choose a username"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Primary Role</label>
                                        <select
                                            value={regPrimary}
                                            onChange={(e) => setRegPrimary(e.target.value as GameRole)}
                                            className="w-full rounded-2xl p-4 outline-none border appearance-none cursor-pointer bg-[#111] border-white/10 text-white focus:border-rose-500"
                                        >
                                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Secondary Role</label>
                                        <select
                                            value={regSecondary}
                                            onChange={(e) => setRegSecondary(e.target.value as GameRole)}
                                            className="w-full rounded-2xl p-4 outline-none border appearance-none cursor-pointer bg-[#111] border-white/10 text-white focus:border-rose-500"
                                        >
                                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Top 3 Agents ({regAgents.length}/3)</label>
                                    <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                                        {AGENTS.map(agent => (
                                            <button
                                                key={agent}
                                                type="button"
                                                onClick={() => handleAgentToggle(agent)}
                                                className={`
                                            px-3 py-2 rounded-xl text-sm border transition-all font-medium
                                            ${regAgents.includes(agent)
                                                        ? `bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20`
                                                        : `border-transparent text-zinc-400 bg-[#111] border-white/5 hover:bg-[#1a1a1a]`}
                                        `}
                                            >
                                                {agent}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {regError && (
                                    <div className="flex items-center p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        <AlertTriangle className="w-4 h-4 mr-3 flex-shrink-0" />
                                        {regError}
                                    </div>
                                )}

                                <div className="relative group w-full mt-6">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-rose-600 to-red-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                                    <button
                                        type="submit"
                                        className="relative w-full py-4 bg-white text-black font-bold rounded-2xl transition-all hover:bg-zinc-200 active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    >
                                        Finish Setup
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Right Pane - Visual / Abstract Background */}
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-black">
                {/* Abstract Gradients using Tailwind and CSS properties */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0c051a] via-[#050505] to-[#1a050c]"></div>

                {/* Glow Effects */}
                <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-rose-500/20 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[8000ms]"></div>
                <div className="absolute bottom-1/4 -left-1/4 w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[12000ms]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none"></div>

                {/* Floating elements mimicking the canvas aesthetic */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-12">
                    <div className="relative w-full aspect-square max-w-2xl bg-white/[0.02] border border-white/10 rounded-[3rem] backdrop-blur-3xl shadow-2xl flex items-center justify-center overflow-hidden transform rotate-[-2deg] transition-transform duration-1000 hover:rotate-0">
                        {/* Inner Card Elements for decoration */}
                        <div className="absolute -top-12 -left-12 w-48 h-32 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md shadow-xl translate-y-4 -rotate-6"></div>
                        <div className="absolute -bottom-12 -right-12 w-64 h-48 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md shadow-xl -translate-y-8 rotate-3"></div>
                        <div className="absolute top-1/2 right-20 w-32 h-32 bg-rose-500/20 rounded-full blur-[40px]"></div>
                        <div className="absolute top-10 left-20 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px]"></div>

                        <div className="text-center z-10 px-8">
                            <h2 className="text-4xl lg:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-600 mb-6 drop-shadow-sm">
                                Elevate Your Game
                            </h2>
                            <p className="text-zinc-400 text-lg max-w-sm mx-auto font-medium">
                                Connecting players, tracking performance, and elevating your competitive experience in real-time.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Modern Dot Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.2]" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>
        </div>
    );
};

export default Auth;
