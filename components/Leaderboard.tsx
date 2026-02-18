import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getRankInfo } from '../services/gameService';
import Card from './ui/Card';
import { RankRequirementsModal } from './RankRequirementsModal';
import { Info } from 'lucide-react';

const Leaderboard = () => {
  const { allUsers, themeMode, setViewProfileId } = useGame();
  const [sortBy, setSortBy] = useState<'mmr' | 'level'>('mmr');
  const [showRankInfoModal, setShowRankInfoModal] = useState(false);
  
  // Filter out bots and sort
  const sortedUsers = [...allUsers]
    .filter(u => !u.isBot) 
    .sort((a, b) => {
        if (sortBy === 'mmr') {
            return b.points - a.points;
        } else {
            // Sort by Level, then XP, then MMR
            if (b.level !== a.level) return b.level - a.level;
            if (b.xp !== a.xp) return (b.xp || 0) - (a.xp || 0);
            return b.points - a.points;
        }
    });

  return (
    <>
      {/* Fixed button aligned with right edge of max-w-4xl container */}
      <div className="fixed top-24 z-40 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 pointer-events-none flex justify-end">
          <button
            type="button"
            onClick={() => setShowRankInfoModal(true)}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-xl shadow-lg text-sm font-medium transition-colors bg-rose-500/20 border-rose-500/30 text-rose-300 hover:bg-rose-500/30 hover:border-rose-500/50"
            title="View rank requirements"
          >
            <Info className="w-4 h-4" />
            How points work
          </button>
      </div>

      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      <RankRequirementsModal isOpen={showRankInfoModal} onClose={() => setShowRankInfoModal(false)} themeMode={themeMode} />

      <div className="mb-8 text-center">
        <h2 className={`text-4xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>RANKINGS</h2>
        <p className="text-zinc-500 uppercase tracking-widest text-xs mt-2">Top Rated Players</p>
      </div>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
        <div className={`flex p-1 rounded-2xl ${themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-200'}`}>
            <button 
                type="button"
                onClick={() => setSortBy('mmr')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${sortBy === 'mmr' ? 'bg-rose-500 text-white shadow-lg' : themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}
            >
                MMR Ranking
            </button>
            <button 
                type="button"
                onClick={() => setSortBy('level')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${sortBy === 'level' ? 'bg-rose-500 text-white shadow-lg' : themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}
            >
                Level Ranking
            </button>
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className={`text-xs uppercase text-zinc-500 border-b ${themeMode === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                    <th className="p-4 font-normal tracking-widest">Rank</th>
                    <th className="p-4 font-normal tracking-widest">Player</th>
                    <th className="p-4 font-normal tracking-widest">Tier</th>
                    <th className="p-4 font-normal tracking-widest text-center">Level</th>
                    <th className="p-4 font-normal tracking-widest text-right">Rating</th>
                    <th className="p-4 font-normal tracking-widest text-right hidden sm:table-cell">W/L</th>
                </tr>
            </thead>
            <tbody className={`divide-y ${themeMode === 'dark' ? 'divide-white/5' : 'divide-black/5'}`}>
                {sortedUsers.map((user, index) => {
                    const position = index + 1;
                    const rankInfo = getRankInfo(user.points, position);
                    return (
                        <tr 
                            key={user.id} 
                            onClick={() => setViewProfileId(user.id)}
                            className={`transition-colors group cursor-pointer ${themeMode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                        >
                            <td className={`p-4 font-mono text-zinc-500 ${themeMode === 'dark' ? 'group-hover:text-white' : 'group-hover:text-black'}`}>#{index + 1}</td>
                            <td className="p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden text-white">
                                        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.username[0].toUpperCase()}
                                    </div>
                                    <span className={`font-display font-medium ${index === 0 ? 'text-rose-500' : (themeMode === 'dark' ? 'text-white' : 'text-black')}`}>{user.username}</span>
                                </div>
                            </td>
                            <td className="p-4">
                                <span 
                                    className={`text-xs px-2 py-1 rounded-md border ${themeMode === 'dark' ? 'bg-black/40 border-white/5' : 'bg-zinc-800 border-black/5'}`} 
                                    style={{ color: rankInfo.color }}
                                >
                                    {rankInfo.name}
                                </span>
                            </td>
                            <td className="p-4 text-center">
                                <span className="font-bold text-zinc-400">{user.level || 1}</span>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-zinc-500">{Math.floor(user.points)}</td>
                            <td className="p-4 text-right text-sm text-zinc-400 hidden sm:table-cell">{user.wins} / {user.losses}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </Card>
    </div>
    </>
  );
};

export default Leaderboard;
