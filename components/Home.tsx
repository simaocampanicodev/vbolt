import React, { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { getRankInfo, getLevelProgress } from '../services/gameService';
import Card from './ui/Card';
import Button from './ui/Button';
import { Play, Trophy, Target, TrendingUp, History, Map as MapIcon, ChevronRight, UserPlus } from 'lucide-react';
import { MatchRecord, Quest } from '../types';
import { QUEST_POOL } from '../constants';

const Home = ({ setCurrentView }: { setCurrentView: (view: string) => void }) => {
  const { currentUser, allUsers, matchHistory, themeMode } = useGame();

  // Calculated properties
  const leaderboardPosition = useMemo(() => {
    const byPoints = [...allUsers].filter(u => !u.isBot).sort((a, b) => b.points - a.points);
    const idx = byPoints.findIndex(u => u.id === currentUser.id);
    return idx === -1 ? undefined : idx + 1;
  }, [allUsers, currentUser.id]);

  const totalHumanUsers = useMemo(() => allUsers.filter(u => !u.isBot).length, [allUsers]);
  const topPercent = leaderboardPosition && totalHumanUsers > 0
    ? Math.max(1, Math.round((leaderboardPosition / totalHumanUsers) * 100))
    : 100;

  const rank = getRankInfo(currentUser.points, leaderboardPosition);
  const nextRankThreshold = rank.max === Infinity ? rank.min : rank.max;
  const currentTierPoints = rank.min;
  const rankProgressPercent = Math.min(
    100,
    Math.max(0, ((currentUser.points - currentTierPoints) / (nextRankThreshold - currentTierPoints)) * 100)
  );

  const totalGames = currentUser.wins + currentUser.losses;
  const winrate = totalGames > 0 ? ((currentUser.wins / totalGames) * 100).toFixed(1) : "0.0";

  // User matches for calculating form and best map
  const userMatches = useMemo(() => {
    return matchHistory.filter((m: MatchRecord) => {
      const a = m.teamAIds || [];
      const b = m.teamBIds || [];
      return a.includes(currentUser.id) || b.includes(currentUser.id);
    }).sort((a, b) => b.date - a.date);
  }, [matchHistory, currentUser.id]);

  const bestMapData = useMemo(() => {
    const stats: Record<string, { played: number, wins: number }> = {};
    userMatches.forEach((m: MatchRecord) => {
      if (!stats[m.map]) stats[m.map] = { played: 0, wins: 0 };
      stats[m.map].played += 1;
      const myTeam = (m.teamAIds || []).includes(currentUser.id) ? 'A' : 'B';
      if (m.winner === myTeam) stats[m.map].wins += 1;
    });
    const sorted = Object.entries(stats).sort((a, b) => (b[1].wins / (b[1].played || 1)) - (a[1].wins / (a[1].played || 1)));
    if (sorted.length === 0) return { name: 'N/A', wr: 0 };
    return { name: sorted[0][0], wr: (sorted[0][1].wins / sorted[0][1].played) * 100 };
  }, [userMatches, currentUser.id]);

  const lastMatch = userMatches[0];
  const lastMatchWon = lastMatch ? lastMatch.winner === ((lastMatch.teamAIds || []).includes(currentUser.id) ? 'A' : 'B') : false;

  // Active user quests
  const dailyQuests = currentUser.activeQuests?.filter(q => q.questId.startsWith('q_daily_')) || [];

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500 pb-12">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-4xl lg:text-5xl font-display font-bold tracking-tight ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
            Dashboard
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            Welcome back, <span className={themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}>{currentUser.username}</span>.
          </p>
        </div>
        <div>
          <button
            onClick={() => setCurrentView('friends')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border flex items-center gap-2 transition-colors ${themeMode === 'dark' ? 'bg-zinc-900/50 border-white/10 text-white hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'}`}
          >
            <UserPlus className="w-4 h-4" />
            Add friend
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Play Card (Hero) */}
        <div className="md:col-span-8 lg:col-span-6 relative rounded-3xl overflow-hidden border border-white/10 group shadow-2xl">
          <div className="absolute inset-0 bg-[#3f0f1c]">
            {/* Grid Background pattern */}
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(244, 63, 94, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(244, 63, 94, 0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          </div>

          <div className="relative p-8 lg:p-10 h-full flex flex-col justify-between min-h-[320px]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider mb-6 border border-rose-500/20">
                <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></div>
                Competitive
              </div>
              <h2 className="text-4xl lg:text-5xl font-display font-bold text-white leading-tight mb-4">
                Play with <br /><span className="text-rose-400">Purpose.</span>
              </h2>
              <p className="text-rose-100/60 max-w-sm mt-2 font-medium">
                Enter the queue, play with your friends and claim the leaderboard to be the best.
              </p>
            </div>
            <div className="mt-8">
              <button
                onClick={() => setCurrentView('queue')}
                className="w-full sm:w-auto px-8 py-4 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
              >
                <Play className="w-5 h-5 fill-current" />
                JOIN QUEUE <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column Layout */}
        <div className="md:col-span-4 lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Rank Card */}
          <div className={`p-6 rounded-3xl border flex flex-col items-center justify-center relative overflow-hidden ${themeMode === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-zinc-200'} shadow-lg`}>
            <div className="w-full text-left mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Ranking</h3>
            </div>

            <div className="relative w-32 h-32 flex items-center justify-center mb-4">
              {/* Circular Progress Background */}
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="4" fill="transparent" className={`${themeMode === 'dark' ? 'text-zinc-800' : 'text-zinc-100'}`} />
                <circle
                  cx="64" cy="64" r="58"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 58}`}
                  strokeDashoffset={`${2 * Math.PI * 58 * (1 - rankProgressPercent / 100)}`}
                  style={{ color: rank.color }}
                  className="transition-all duration-1000 ease-in-out"
                  strokeLinecap="round"
                />
              </svg>
              {/* Rank Core Logo */}
              <div className="w-20 h-20 rounded-full bg-zinc-900/50 flex flex-col items-center justify-center z-10 p-2 text-center text-white font-display" style={{ border: `2px solid ${rank.color}` }}>
                <span className="text-3xl font-bold" style={{ color: rank.color }}>{rank.name.split(' ')[0][0]}</span>
              </div>
            </div>

            <h4 className={`text-xl font-bold font-display ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{rank.name}</h4>
            <div className="w-full mt-4">
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${rankProgressPercent}%`, backgroundColor: rank.color }}></div>
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                <span>Top {topPercent}% Server</span>
                <span>{currentUser.points}/{nextRankThreshold} RP</span>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${themeMode === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-zinc-200'} shadow-lg`}>
            <div className="w-full text-left mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Statistics</h3>
            </div>

            <div className={`p-4 rounded-2xl mb-3 border ${themeMode === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
              <div className="flex justify-between text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">
                <span>Best Map</span>
                <span className="text-rose-500">{bestMapData.name !== 'N/A' ? `${bestMapData.wr.toFixed(0)}% WR` : ''}</span>
              </div>
              <div className={`text-2xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                {bestMapData.name}
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
              <div className="flex justify-between text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">
                <span>Winrate</span>
                <span>{totalGames} games</span>
              </div>
              <div className={`text-3xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                {winrate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">

        {/* Daily Missions */}
        <div className={`lg:col-span-7 p-6 md:p-8 rounded-3xl border ${themeMode === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-zinc-200'} shadow-lg flex flex-col`}>
          <div className="w-full text-left mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Daily Quests</h3>
          </div>
          <div className="space-y-3 flex-1">
            {dailyQuests.length > 0 ? dailyQuests.map((q, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${themeMode === 'dark' ? 'bg-zinc-900/30 border-white/5 hover:bg-zinc-800/50' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'} transition-colors group cursor-pointer`}>
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-6 h-6 rounded border transition-colors ${q.completed ? 'bg-rose-500/20 border-rose-500/50' : (themeMode === 'dark' ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white')}`}>
                    {q.completed && <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                  </div>
                  <span className={`text-sm font-medium ${q.completed ? 'text-zinc-500 line-through' : (themeMode === 'dark' ? 'text-zinc-200' : 'text-zinc-800')}`}>
                    {QUEST_POOL.find((qp) => qp.id === q.questId)?.description || q.questId}
                    {q.completed ? " (Completed)" : ""}
                  </span>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${q.completed ? 'bg-zinc-800 text-zinc-500' : 'bg-rose-500/10 text-rose-400'}`}>
                  +{QUEST_POOL.find((qp) => qp.id === q.questId)?.xpReward || 0} XP
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-6 text-zinc-500 text-sm h-full">
                <Target className="w-8 h-8 mb-3 opacity-20" />
                No daily quests available right now.
              </div>
            )}
          </div>
          {dailyQuests.length > 0 && (
            <div className="mt-6 text-xs text-zinc-500 font-medium">
              Completed: {dailyQuests.filter(q => q.completed).length}/{dailyQuests.length}
            </div>
          )}
        </div>

        {/* Community & Last Match Wrapper */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">

          {/* Roadmap / Community */}
          <div className={`p-6 rounded-3xl border relative overflow-hidden group cursor-pointer ${themeMode === 'dark' ? 'bg-[#1a050c] border-[#4e1b27]' : 'bg-rose-50 border-rose-100'} shadow-lg`} onClick={() => setCurrentView('suggestions')}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[50px] rounded-full group-hover:bg-rose-500/20 transition-all duration-500"></div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider mb-4 border border-rose-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
              Community
            </div>
            <h3 className={`text-xl font-display font-bold mb-2 ${themeMode === 'dark' ? 'text-white' : 'text-rose-900'}`}>Suggestions</h3>
            <p className={`text-sm mb-6 ${themeMode === 'dark' ? 'text-rose-200/60' : 'text-rose-900/60'}`}>
              Vote on suggestions and track development in real-time.
            </p>
            <button className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs uppercase tracking-wider rounded-xl border border-rose-500/20 transition-colors hidden sm:block">
              View Suggestions
            </button>
          </div>

          {/* Last Match */}
          <div className={`p-6 rounded-3xl border flex flex-col relative ${themeMode === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-zinc-200'} shadow-lg`}>
            <div className="w-full flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Last Match</h3>
              <Trophy className="w-4 h-4 text-zinc-500" />
            </div>

            {lastMatch ? (
              <div
                className={`relative overflow-hidden p-6 rounded-3xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] ${themeMode === 'dark'
                  ? 'bg-[#0a0a0a] border-white/5 hover:border-white/10'
                  : 'bg-white border-zinc-200 hover:border-zinc-300'
                  } shadow-lg`}
                onClick={() => setCurrentView('history')}
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${lastMatchWon
                  ? 'from-emerald-500/10 to-teal-500/10'
                  : 'from-red-500/10 to-orange-500/10'
                  }`}></div>

                <div className="relative">
                  {/* Match Result Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${lastMatchWon
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                      <div className={`w-2 h-2 rounded-full ${lastMatchWon ? 'bg-emerald-400' : 'bg-red-400'
                        }`}></div>
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {lastMatchWon ? 'Victory' : 'Defeat'}
                      </span>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${themeMode === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                      }`}>
                      {new Date(lastMatch.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {/* Match Score */}
                  <div className="flex items-center justify-center mb-4">
                    <div className={`text-3xl font-display font-bold ${lastMatchWon ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                      {lastMatch.score}
                    </div>
                  </div>

                  {/* Map Name */}
                  <div className="text-center">
                    <div className={`font-display font-bold text-lg mb-1 ${themeMode === 'dark' ? 'text-white' : 'text-black'
                      }`}>
                      {lastMatch.map}
                    </div>
                    <div className={`text-sm font-medium ${themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
                      }`}>
                      Click to view match history
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-zinc-500 text-sm">
                <History className="w-8 h-8 mb-3 opacity-20" />
                No recent matches.
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};

export default Home;
