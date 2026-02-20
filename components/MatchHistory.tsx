import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import Card from './ui/Card';
import { MatchRecord } from '../types';
import { ChevronDown, ChevronUp, Crown } from 'lucide-react';

const MatchHistory = () => {
    const { matchHistory, currentUser, themeMode } = useGame();
    const [filter, setFilter] = useState<'all' | 'mine'>('mine');
    const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

    const filteredHistory = matchHistory.filter(match => {
        if (filter === 'all') return true;
        const a = match.teamAIds || [];
        const b = match.teamBIds || [];
        return a.includes(currentUser.id) || b.includes(currentUser.id);
    });

    const getResultColor = (match: MatchRecord) => {
        const a = match.teamAIds || [];
        const b = match.teamBIds || [];
        if (!a.includes(currentUser.id) && !b.includes(currentUser.id)) return 'border-zinc-500/20';
        const myTeam = a.includes(currentUser.id) ? 'A' : 'B';
        const won = myTeam === match.winner;
        return won ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5';
    };

    const getResultText = (match: MatchRecord) => {
        const a = match.teamAIds || [];
        const b = match.teamBIds || [];
        if (!a.includes(currentUser.id) && !b.includes(currentUser.id)) return 'SPECTATED';
        const myTeam = a.includes(currentUser.id) ? 'A' : 'B';
        return myTeam === match.winner ? 'VICTORY' : 'DEFEAT';
    };

    const getBadgeStyle = (match: MatchRecord) => {
        const a = match.teamAIds || [];
        const b = match.teamBIds || [];
        if (!a.includes(currentUser.id) && !b.includes(currentUser.id))
            return 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30';
        const myTeam = a.includes(currentUser.id) ? 'A' : 'B';
        const won = myTeam === match.winner;

        if (won) return 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]';
        return 'bg-red-600 text-white border-red-600 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
    };

    const toggleExpand = (id: string) => {
        setExpandedMatch(expandedMatch === id ? null : id);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8 text-center">
                <h2 className={`text-4xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>History</h2>
                <p className="text-zinc-500 uppercase tracking-widest text-xs mt-2">Past Performance</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
                <div className={`flex p-1 rounded-2xl ${themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-200'}`}>
                    <button
                        onClick={() => setFilter('mine')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${filter === 'mine' ? 'bg-rose-500 text-white shadow-lg' : 'text-zinc-500'}`}
                    >
                        My Matches
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${filter === 'all' ? 'bg-rose-500 text-white shadow-lg' : 'text-zinc-500'}`}
                    >
                        Global
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {filteredHistory.length === 0 ? (
                    <Card className="text-center text-zinc-500 py-12 italic">
                        No matches found.
                    </Card>
                ) : (
                    filteredHistory.map((match) => (
                        <Card key={match.id} className={`border-l-4 transition-all ${getResultColor(match)}`} noPadding>
                            <div
                                className="p-6 flex items-center justify-between cursor-pointer"
                                onClick={() => toggleExpand(match.id)}
                            >
                                {/* Left Team */}
                                <div className="w-1/3 text-left">
                                    <h3 className={`font-display font-bold text-lg ${match.winner === 'A' ? 'text-rose-500' : 'text-zinc-500'}`}>
                                        Team {match.captainA}
                                    </h3>
                                    {match.winner === 'A' && <span className="text-[10px] bg-rose-500/20 text-rose-500 px-2 py-0.5 rounded uppercase">Winner</span>}
                                </div>

                                {/* Center Info */}
                                <div className="text-center w-1/3 flex flex-col items-center">
                                    <span className={`text-2xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                                        {match.score}
                                    </span>
                                    <span className="text-xs text-zinc-500 uppercase tracking-widest mt-1">{match.map}</span>
                                    <span className={`text-[10px] mt-2 font-bold px-3 py-1 rounded border ${getBadgeStyle(match)}`}>
                                        {getResultText(match)}
                                    </span>
                                </div>

                                {/* Right Team */}
                                <div className="w-1/3 text-right flex flex-col items-end">
                                    <h3 className={`font-display font-bold text-lg ${match.winner === 'B' ? 'text-rose-500' : 'text-zinc-500'}`}>
                                        Team {match.captainB}
                                    </h3>
                                    {match.winner === 'B' && <span className="text-[10px] bg-rose-500/20 text-rose-500 px-2 py-0.5 rounded uppercase">Winner</span>}
                                </div>

                                <div className="ml-4 text-zinc-500">
                                    {expandedMatch === match.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                            </div>

                            {/* Expanded Roster View */}
                            {expandedMatch === match.id && (
                                <div className={`p-6 border-t ${themeMode === 'dark' ? 'border-white/5 bg-black/10' : 'border-black/5 bg-black/5'}`}>
                                    <div className="space-y-6">
                                        {/* Team Rosters */}
                                        <div className="grid grid-cols-2 gap-8">
                                            {/* Team A Roster */}
                                            <div>
                                                <h4 className="text-xs uppercase text-zinc-500 mb-2">Team {match.captainA} Players</h4>
                                                <div className="space-y-2">
                                                    {match.teamASnapshot.map((p, idx) => (
                                                        <div key={p.id} className="flex items-center text-sm">
                                                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden text-white mr-3">
                                                                {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" /> : p.username[0].toUpperCase()}
                                                            </div>
                                                            {idx === 0 && <Crown className="w-4 h-4 text-amber-400 mr-1.5 shrink-0" />}
                                                            <span className={`font-medium mr-2 ${themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>{p.username}</span>
                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-500">{p.role}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Team B Roster */}
                                            <div className="text-right">
                                                <h4 className="text-xs uppercase text-zinc-500 mb-2">Team {match.captainB} Players</h4>
                                                <div className="space-y-2">
                                                    {match.teamBSnapshot.map((p, idx) => (
                                                        <div key={p.id} className="flex items-center justify-end text-sm">
                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-500 mr-2">{p.role}</span>
                                                            <span className={`font-medium mr-3 ${themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>{p.username}</span>
                                                            {idx === 0 && <Crown className="w-4 h-4 text-amber-400 ml-1.5 shrink-0" />}
                                                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden text-white ml-2">
                                                                {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" /> : p.username[0].toUpperCase()}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default MatchHistory;