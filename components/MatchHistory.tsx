import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import Card from './ui/Card';
import { MatchRecord } from '../types';
import { MAP_IMAGES } from '../constants';
import { Crown, X, Eye, Search, Trophy, MapPin, Clock, Users, Swords } from 'lucide-react';

/* ───────────────────────────── helpers ───────────────────────────── */

const shortId = (id: string) => id.slice(0, 8);

const formatDate = (ts: number) => {
    const d = new Date(ts);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(ts);
};

/* ─────────────────────── Match Detail Modal ──────────────────────── */

interface MatchDetailProps {
    match: MatchRecord;
    currentUserId: string;
    themeMode: string;
    onClose: () => void;
}

const MatchDetailModal: React.FC<MatchDetailProps> = ({ match, currentUserId, themeMode, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);
    const backdropRef = useRef<HTMLDivElement>(null);

    const mapImage = MAP_IMAGES[match.map] || '';

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => onClose(), 350);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === backdropRef.current) handleClose();
    };

    // Lock scroll while modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const isTeamAWinner = match.winner === 'A';
    const isTeamBWinner = match.winner === 'B';

    return createPortal(
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className={`fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
            style={{ animationDuration: '300ms', animationFillMode: 'both' }}
        >
            <div
                className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-t-[2rem] ${themeMode === 'dark' ? 'bg-zinc-950' : 'bg-white'} shadow-2xl ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}
                style={{ animationDuration: '350ms', animationFillMode: 'both' }}
            >
                {/* Map Banner Header */}
                <div className="relative h-48 md:h-56 overflow-hidden rounded-t-[2rem]">
                    <img
                        src={mapImage}
                        alt={match.map}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/90"></div>

                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-110"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Map info */}
                    <div className="absolute bottom-6 left-8 z-10">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-emerald-500/90 text-white px-3 py-1 rounded-full mb-3">
                            Match Details
                        </span>
                        <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-wider drop-shadow-2xl">
                            {match.map}
                        </h2>
                    </div>

                    {/* Score in banner */}
                    <div className="absolute bottom-6 right-8 z-10 text-right">
                        <div className="text-3xl md:text-4xl font-display font-black text-white drop-shadow-2xl">
                            {match.score}
                        </div>
                        <span className="text-xs text-zinc-300 uppercase tracking-widest">
                            {formatDate(match.date)}
                        </span>
                    </div>
                </div>

                {/* Two Teams Section */}
                <div className="p-6 md:p-10">
                    {/* Score Bar */}
                    <div className="flex items-center justify-center gap-6 mb-8">
                        <div className={`flex items-center gap-3 ${isTeamAWinner ? 'opacity-100' : 'opacity-50'}`}>
                            {isTeamAWinner && <Trophy className="w-5 h-5 text-amber-400" />}
                            <span className={`text-lg font-display font-bold uppercase tracking-wider ${isTeamAWinner ? 'text-emerald-400' : (themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}`}>
                                Team {match.captainA}
                            </span>
                            {isTeamAWinner && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase font-bold">Winner</span>}
                        </div>

                        <div className={`px-6 py-3 rounded-2xl border ${themeMode === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
                            <span className={`text-3xl font-display font-black ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                                {match.score}
                            </span>
                        </div>

                        <div className={`flex items-center gap-3 ${isTeamBWinner ? 'opacity-100' : 'opacity-50'}`}>
                            {isTeamBWinner && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase font-bold">Winner</span>}
                            <span className={`text-lg font-display font-bold uppercase tracking-wider ${isTeamBWinner ? 'text-emerald-400' : (themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}`}>
                                Team {match.captainB}
                            </span>
                            {isTeamBWinner && <Trophy className="w-5 h-5 text-amber-400" />}
                        </div>
                    </div>

                    {/* Team Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Team A */}
                        <div className={`rounded-2xl border overflow-hidden ${isTeamAWinner
                            ? (themeMode === 'dark' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-400/40 bg-emerald-50')
                            : (themeMode === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-zinc-200 bg-zinc-50')
                            }`}>
                            <div className={`px-5 py-3 flex items-center gap-2 border-b ${isTeamAWinner
                                ? (themeMode === 'dark' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-emerald-300/30 bg-emerald-100/50')
                                : (themeMode === 'dark' ? 'border-white/5 bg-white/[0.03]' : 'border-zinc-200 bg-zinc-100/50')
                                }`}>
                                <Swords className={`w-4 h-4 ${isTeamAWinner ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                <span className={`text-xs font-bold uppercase tracking-widest ${isTeamAWinner ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                    Team {match.captainA} {isTeamAWinner ? '— WINNER' : ''}
                                </span>
                            </div>
                            <div className="divide-y divide-white/5">
                                {match.teamASnapshot.map((p, idx) => {
                                    const isCaptain = idx === 0;
                                    const isMe = p.id === currentUserId;
                                    return (
                                        <div
                                            key={p.id}
                                            className={`flex items-center gap-4 px-5 py-4 transition-colors ${isMe ? (themeMode === 'dark' ? 'bg-white/[0.04]' : 'bg-blue-50/50') : ''} hover:bg-white/[0.03]`}
                                        >
                                            {/* Avatar */}
                                            <div className={`relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 ${themeMode === 'dark' ? 'bg-zinc-800 border border-white/10' : 'bg-zinc-200 border border-zinc-300'}`}>
                                                {p.avatarUrl
                                                    ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    : <span className={`text-sm font-bold ${themeMode === 'dark' ? 'text-white/30' : 'text-zinc-500'}`}>{p.username[0].toUpperCase()}</span>
                                                }
                                                {isCaptain && (
                                                    <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-zinc-950">
                                                        <Crown className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Name + Role */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-semibold truncate ${isMe ? 'text-blue-400' : (themeMode === 'dark' ? 'text-white' : 'text-zinc-900')}`}>
                                                        {p.username}
                                                    </span>
                                                    {isCaptain && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">Captain</span>}
                                                    {isMe && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                                                </div>
                                                <span className={`text-[10px] uppercase tracking-widest ${themeMode === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>{p.role}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Team B */}
                        <div className={`rounded-2xl border overflow-hidden ${isTeamBWinner
                            ? (themeMode === 'dark' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-400/40 bg-emerald-50')
                            : (themeMode === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-zinc-200 bg-zinc-50')
                            }`}>
                            <div className={`px-5 py-3 flex items-center gap-2 border-b ${isTeamBWinner
                                ? (themeMode === 'dark' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-emerald-300/30 bg-emerald-100/50')
                                : (themeMode === 'dark' ? 'border-white/5 bg-white/[0.03]' : 'border-zinc-200 bg-zinc-100/50')
                                }`}>
                                <Swords className={`w-4 h-4 ${isTeamBWinner ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                <span className={`text-xs font-bold uppercase tracking-widest ${isTeamBWinner ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                    Team {match.captainB} {isTeamBWinner ? '— WINNER' : ''}
                                </span>
                            </div>
                            <div className="divide-y divide-white/5">
                                {match.teamBSnapshot.map((p, idx) => {
                                    const isCaptain = idx === 0;
                                    const isMe = p.id === currentUserId;
                                    return (
                                        <div
                                            key={p.id}
                                            className={`flex items-center gap-4 px-5 py-4 transition-colors ${isMe ? (themeMode === 'dark' ? 'bg-white/[0.04]' : 'bg-blue-50/50') : ''} hover:bg-white/[0.03]`}
                                        >
                                            {/* Avatar */}
                                            <div className={`relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 ${themeMode === 'dark' ? 'bg-zinc-800 border border-white/10' : 'bg-zinc-200 border border-zinc-300'}`}>
                                                {p.avatarUrl
                                                    ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    : <span className={`text-sm font-bold ${themeMode === 'dark' ? 'text-white/30' : 'text-zinc-500'}`}>{p.username[0].toUpperCase()}</span>
                                                }
                                                {isCaptain && (
                                                    <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-zinc-950">
                                                        <Crown className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Name + Role */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-semibold truncate ${isMe ? 'text-blue-400' : (themeMode === 'dark' ? 'text-white' : 'text-zinc-900')}`}>
                                                        {p.username}
                                                    </span>
                                                    {isCaptain && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">Captain</span>}
                                                    {isMe && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                                                </div>
                                                <span className={`text-[10px] uppercase tracking-widest ${themeMode === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>{p.role}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Match ID footer */}
                    <div className={`mt-8 text-center text-[10px] uppercase tracking-widest ${themeMode === 'dark' ? 'text-zinc-700' : 'text-zinc-400'}`}>
                        Match ID: #{shortId(match.id)}
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
        .animate-fadeIn { animation-name: fadeIn; }
        .animate-fadeOut { animation-name: fadeOut; }
        .animate-slideUp { animation-name: slideUp; }
        .animate-slideDown { animation-name: slideDown; }
      `}</style>
        </div>,
        document.body
    );
};

/* ─────────────────────── Main Component ──────────────────────── */

const MatchHistory = ({ initialMatchId, onMatchOpened }: { initialMatchId?: string | null; onMatchOpened?: () => void }) => {
    const { matchHistory, currentUser, themeMode, enableMatchHistory } = useGame();
    const [filter, setFilter] = useState<'all' | 'mine'>('mine');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);
    useEffect(() => {
        enableMatchHistory(true);
        return () => enableMatchHistory(false);
    }, [enableMatchHistory]);

    // Auto-open match detail when navigated from Home's Last Match card
    useEffect(() => {
        if (initialMatchId && !isLoading && matchHistory.length > 0) {
            const match = matchHistory.find(m => m.id === initialMatchId);
            if (match) {
                setSelectedMatch(match);
                onMatchOpened?.();
            }
        }
    }, [initialMatchId, isLoading, matchHistory]);

    const filteredHistory = useMemo(() => {
        let list = matchHistory;

        // Filter by participation
        if (filter === 'mine') {
            list = list.filter(m => {
                const a = m.teamAIds || [];
                const b = m.teamBIds || [];
                return a.includes(currentUser.id) || b.includes(currentUser.id);
            });
        }

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(m =>
                m.map.toLowerCase().includes(q) ||
                m.captainA.toLowerCase().includes(q) ||
                m.captainB.toLowerCase().includes(q) ||
                m.id.toLowerCase().includes(q) ||
                m.score.toLowerCase().includes(q)
            );
        }

        return list;
    }, [matchHistory, filter, searchQuery, currentUser.id]);

    const getMyResult = (match: MatchRecord): 'victory' | 'defeat' | 'spectated' => {
        const a = match.teamAIds || [];
        const b = match.teamBIds || [];
        if (!a.includes(currentUser.id) && !b.includes(currentUser.id)) return 'spectated';
        const myTeam = a.includes(currentUser.id) ? 'A' : 'B';
        return myTeam === match.winner ? 'victory' : 'defeat';
    };

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                        Loading Match History...
                    </h3>
                    <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                        Fetching your match records
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Header */}
            <div className="mb-2">
                <h2 className={`text-3xl md:text-4xl font-display font-black ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                    Match History
                </h2>
                <p className={`text-sm mt-1 ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    Review your past matches and performances
                </p>
            </div>

            {/* Filters + Search Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Filter Tabs */}
                <div className={`flex p-1 rounded-2xl ${themeMode === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-zinc-200 border border-zinc-300'}`}>
                    {(['mine', 'all'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${filter === f
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : (themeMode === 'dark' ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-zinc-900')
                                }`}
                        >
                            {f === 'mine' ? 'My Matches' : 'All Matches'}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className={`relative w-full sm:w-72 ${themeMode === 'dark' ? '' : ''}`}>
                    <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${themeMode === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search matches..."
                        className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-sm outline-none transition-all ${themeMode === 'dark'
                            ? 'bg-white/5 border-white/10 text-white placeholder-zinc-600 focus:border-emerald-500/50'
                            : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500/50'
                            }`}
                    />
                </div>
            </div>

            {/* Match Count */}
            <div className={`text-xs uppercase tracking-widest ${themeMode === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {filteredHistory.length} match{filteredHistory.length !== 1 ? 'es' : ''} found
            </div>

            {/* Match List */}
            <div className="space-y-3">
                {filteredHistory.length === 0 ? (
                    <Card className="text-center py-16">
                        <div className={`text-5xl mb-4`}>🎮</div>
                        <h3 className={`text-lg font-bold mb-2 ${themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            No matches found
                        </h3>
                        <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            {filter === 'mine' ? 'You haven\'t played any matches yet' : 'No matches in the system'}
                        </p>
                    </Card>
                ) : (
                    filteredHistory.map((match) => {
                        const result = getMyResult(match);
                        const mapImg = MAP_IMAGES[match.map] || '';
                        const playerCount = (match.teamAIds?.length || 0) + (match.teamBIds?.length || 0);

                        return (
                            <div
                                key={match.id}
                                className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 hover:scale-[1.01] ${themeMode === 'dark'
                                    ? 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                                    : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-lg'
                                    } ${result === 'victory'
                                        ? (themeMode === 'dark' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-emerald-500')
                                        : result === 'defeat'
                                            ? (themeMode === 'dark' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-red-500')
                                            : 'border-l-4 border-l-zinc-500'
                                    }`}
                            >
                                <div className="flex items-center gap-4 p-4 md:p-5">
                                    {/* Map Thumbnail */}
                                    <div className="relative w-16 h-16 md:w-20 md:h-14 rounded-xl overflow-hidden shrink-0">
                                        <img src={mapImg} alt={match.map} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/30"></div>
                                    </div>

                                    {/* Match Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-display font-bold text-sm md:text-base truncate ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                                                {match.map}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${themeMode === 'dark' ? 'bg-white/5 text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>
                                                #{shortId(match.id)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className={`flex items-center gap-1 text-[11px] ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                <Clock className="w-3 h-3" />
                                                {timeAgo(match.date)}
                                            </span>
                                            <span className={`flex items-center gap-1 text-[11px] ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                <Users className="w-3 h-3" />
                                                {playerCount} players
                                            </span>
                                            <span className={`flex items-center gap-1 text-[11px] ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                <MapPin className="w-3 h-3" />
                                                {match.captainA} vs {match.captainB}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Result Badge + Score */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right hidden sm:block">
                                            <div className={`text-lg font-display font-black ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                                                {match.score}
                                            </div>
                                        </div>

                                        {/* Result badge */}
                                        <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border ${result === 'victory'
                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                            : result === 'defeat'
                                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                                : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                                            }`}>
                                            {result === 'victory' ? 'Victory' : result === 'defeat' ? 'Defeat' : 'Spectated'}
                                        </span>

                                        {/* Details button */}
                                        <button
                                            onClick={() => setSelectedMatch(match)}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${themeMode === 'dark'
                                                ? 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30'
                                                : 'bg-zinc-100 border border-zinc-200 text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300'
                                                }`}
                                            title="View match details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Match Detail Modal */}
            {selectedMatch && (
                <MatchDetailModal
                    match={selectedMatch}
                    currentUserId={currentUser.id}
                    themeMode={themeMode}
                    onClose={() => setSelectedMatch(null)}
                />
            )}
        </div>
    );
};

export default MatchHistory;
