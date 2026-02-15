import React from 'react';
import { useGame } from '../context/GameContext';
import Card from './ui/Card';
import Button from './ui/Button';
import { Users, Zap, Shield, AlertTriangle } from 'lucide-react';

interface QueueProps {
    setCurrentView?: (view: string) => void;
}

const Queue = () => {
  const { queue, joinQueue, leaveQueue, currentUser, testFillQueue, themeMode, isAdmin, setViewProfileId } = useGame();
  
  const isInQueue = queue.some(u => u.id === currentUser.id);
  const hasRiotAccount = !!(currentUser.riotId && currentUser.riotTag);

  const getRoleIcon = (role: string) => {
    if (role.includes('Duelist')) return <Zap className="w-3 h-3" />;
    if (role.includes('Sentinel')) return <Shield className="w-3 h-3" />;
    return <Users className="w-3 h-3" />;
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-in fade-in duration-700">
      
      <div className="text-center space-y-2">
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
        <p className="text-zinc-500 tracking-widest uppercase text-sm">PORTUGUESE HUB</p>
      </div>

      <div className="relative w-full max-w-md">
         {/* Queue Status Ring */}
         <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-64 h-64 rounded-full border ${themeMode === 'dark' ? 'border-white/5' : 'border-black/5'} animate-[spin_10s_linear_infinite] opacity-30`}></div>
            <div className={`absolute w-48 h-48 rounded-full border border-rose-500/20 ${isInQueue ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}`}></div>
         </div>

         <div className="relative z-10 flex flex-col items-center justify-center space-y-6 py-12">
            <div className="text-center">
                <span className={`text-5xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>{queue.length}</span>
                <span className="text-2xl text-zinc-500 font-light">/10</span>
            </div>

            {isInQueue ? (
                <Button variant="danger" size="lg" onClick={leaveQueue} className="min-w-[200px]">
                    Leave Queue
                </Button>
            ) : (
                <>
                    {hasRiotAccount ? (
                        <Button variant="primary" size="lg" onClick={joinQueue} className="min-w-[200px]">
                            Join Queue
                        </Button>
                    ) : (
                        <div className="flex flex-col items-center space-y-3">
                            <Button disabled className="min-w-[200px] bg-zinc-700 cursor-not-allowed text-zinc-400 opacity-50">
                                Join Queue
                            </Button>
                            <div className="flex items-center text-xs text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
                                <AlertTriangle className="w-3 h-3 mr-2" />
                                <span>Link Riot Account in Profile to play</span>
                            </div>
                        </div>
                    )}
                </>
            )}
         </div>
      </div>

      {/* Connected Players List */}
      <Card className="w-full max-w-2xl" noPadding>
         <div className={`p-4 border-b flex justify-between items-center ${themeMode === 'dark' ? 'bg-black/20 border-white/5' : 'bg-zinc-100 border-black/5'}`}>
            <h3 className="text-xs uppercase tracking-widest text-zinc-500">Queue Lobby</h3>
            {isAdmin && (
                <button onClick={testFillQueue} className="text-[10px] text-zinc-500 hover:text-rose-500 uppercase transition-colors">
                    [Admin] Fill Queue
                </button>
            )}
         </div>
         <div className={`divide-y max-h-[200px] overflow-y-auto ${themeMode === 'dark' ? 'divide-white/5' : 'divide-black/5'}`}>
             {queue.length === 0 ? (
                 <div className="p-8 text-center text-zinc-500 text-sm italic">
                     Lobby is empty. Be the first to join.
                 </div>
             ) : (
                 queue.map((player) => (
                     <div 
                        key={player.id} 
                        onClick={() => setViewProfileId(player.id)}
                        className={`flex justify-between items-center p-4 transition-colors cursor-pointer ${themeMode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                     >
                         <div className="flex items-center space-x-3">
                             <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden text-white">
                                 {player.avatarUrl ? <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xs">{player.username.substring(0,1)}</span>}
                             </div>
                             <span className={`font-display font-medium text-sm ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>{player.username}</span>
                         </div>
                         <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1 text-zinc-500 text-xs">
                                {getRoleIcon(player.primaryRole)}
                                <span>{player.primaryRole}</span>
                            </div>
                            <span className="text-zinc-500 font-mono text-xs">{Math.floor(player.points)} MMR</span>
                         </div>
                     </div>
                 ))
             )}
         </div>
      </Card>

    </div>
  );
};

export default Queue;