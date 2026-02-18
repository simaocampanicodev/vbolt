import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { db } from '../lib/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { MatchPhase } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { getRankInfo } from '../services/gameService';
import { MAP_IMAGES, MAPS } from '../constants';
import { Trophy, Clock, Ban, AlertTriangle, MessageSquare, Send, ThumbsUp, Flag, X, User, Copy, Lock, Crown, Save, Check } from 'lucide-react';

const MatchInterface = () => {
  const { matchState, acceptMatch, draftPlayer, vetoMap, reportResult, sendChatMessage, currentUser, resetMatch, forceTimePass, exitMatchToLobby, handleBotAction, themeMode, isAdmin, commendPlayer, submitReport, matchInteractions, markPlayerAsInteracted, showToast } = useGame();
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Mobile UI State
  const [activeTab, setActiveTab] = useState<'game' | 'chat'>('game');

  // Reporting State
  const [scoreA, setScoreA] = useState<string>('');
  const [scoreB, setScoreB] = useState<string>('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  // Reputation & Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>('Toxic Behavior');

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [localMatchCode, setLocalMatchCode] = useState('');
  const [matchPanelOpen, setMatchPanelOpen] = useState(false);
  const [showCreatingMatch, setShowCreatingMatch] = useState(false);
  const [readyProgress, setReadyProgress] = useState(0);

  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [matchState?.chat, activeTab]);

  // Bot Automation Hook
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (matchState && (matchState.phase === MatchPhase.DRAFT || matchState.phase === MatchPhase.VETO)) {
        timer = setTimeout(() => {
            handleBotAction();
        }, 1500); 
    }
    return () => clearTimeout(timer);
  }, [matchState?.phase, matchState?.turn, matchState?.remainingPool.length, matchState?.remainingMaps.length]); 

  useEffect(() => {
    if (matchState?.phase === MatchPhase.LIVE && matchState.startTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - matchState.startTime!;
        setTimeLeft(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [matchState?.phase, matchState?.startTime]);

  if (!matchState) return null;

  const isCaptain = matchState.captainA?.id === currentUser.id || matchState.captainB?.id === currentUser.id;
  const isMyTurn = (matchState.turn === 'A' && matchState.captainA?.id === currentUser.id) ||
                   (matchState.turn === 'B' && matchState.captainB?.id === currentUser.id);
  const isFinished = matchState.phase === MatchPhase.FINISHED;

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const minutesPassed = Math.floor(timeLeft / 60000);
  const canReport = minutesPassed >= 20; // reports unlock after 20 minutes (incl. test matches)

  // Sincronizar código da partida local com o estado global
  useEffect(() => {
    if (matchState?.matchCode != null) {
      setLocalMatchCode(matchState.matchCode);
    }
  }, [matchState?.matchCode]);

  // Determine Result Title & Color
  const teamA = matchState.teamA || [];
  const teamB = matchState.teamB || [];
  const userTeam = teamA.some(u => u?.id === currentUser.id) ? 'A' : (teamB.some(u => u?.id === currentUser.id) ? 'B' : null);
  let resultTitle = "MATCH ENDED";
  let resultColor = themeMode === 'dark' ? 'text-white' : 'text-black';
  
  if (userTeam && matchState.winner) {
      if (matchState.winner === userTeam) {
          resultTitle = "VICTORY";
          resultColor = "text-emerald-500 drop-shadow-[0_0_35px_rgba(16,185,129,0.4)]";
      } else {
          resultTitle = "DEFEAT";
          resultColor = "text-rose-500 drop-shadow-[0_0_35px_rgba(225,29,72,0.4)]";
      }
  }

  // Average rank por equipa
  const avgPointsA = teamA.length ? teamA.reduce((sum, p) => sum + p.points, 0) / teamA.length : 0;
  const avgPointsB = teamB.length ? teamB.reduce((sum, p) => sum + p.points, 0) / teamB.length : 0;
  const avgRankA = getRankInfo(avgPointsA).name;
  const avgRankB = getRankInfo(avgPointsB).name;

  const handleReportSubmit = async () => {
      const sA = parseInt(scoreA);
      const sB = parseInt(scoreB);

      if (isNaN(sA) || isNaN(sB)) {
          setReportError("Please enter valid numbers.");
          return;
      }
      
      if (sA < 0 || sB < 0) {
          setReportError("Scores cannot be negative.");
          return;
      }

      const winner = Math.max(sA, sB);
      const loser = Math.min(sA, sB);

      if (winner < 13) {
          setReportError("A team must win at least 13 rounds.");
          return;
      }

      setReportError(null);
      const result = await reportResult(sA, sB);
      if (!result.success) {
          setReportError(result.message || "Error submitting report");
          return;
      }

      // Clear inputs on success (UI feedback)
      setScoreA('');
      setScoreB('');
  };

  const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if (chatInput.trim()) {
          sendChatMessage(chatInput);
          setChatInput('');
      }
  };

  const handleCommend = (targetId: string) => {
      if ((matchInteractions || []).includes(targetId)) return;
      commendPlayer(targetId);
      markPlayerAsInteracted(targetId);
  };

  const openReportModal = (targetId: string) => {
      if ((matchInteractions || []).includes(targetId)) return;
      setReportTargetId(targetId);
      setReportModalOpen(true);
      setReportReason('Toxic Behavior');
  };

  const submitReportReason = () => {
      if (reportTargetId) {
          submitReport(reportTargetId, reportReason);
          markPlayerAsInteracted(reportTargetId);
          setReportModalOpen(false);
          setReportTargetId(null);
      }
  };

  const reportReasons = [
      'Toxic Behavior',
      'AFK / Leaving',
      'Griefing / Throwing',
      'Abusive Voice Chat'
  ];

  // Calculate progress bar for ready check (starts at 100% and decreases from right to left)
  useEffect(() => {
    if (matchState?.phase !== MatchPhase.READY_CHECK || !matchState.readyExpiresAt) {
      setReadyProgress(100);
      return;
    }
    
    const updateProgress = () => {
      const now = Date.now();
      const timeLeft = matchState.readyExpiresAt! - now;
      const totalTime = 60000; // 60 seconds
      // Start at 100% and decrease to 0% as time runs out
      const progressPercent = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
      setReadyProgress(progressPercent);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 50); // Update every 50ms for smooth animation
    return () => clearInterval(interval);
  }, [matchState?.phase, matchState?.readyExpiresAt]);

  // Show "Creating match..." when only one map remains in veto phase
  useEffect(() => {
    if (matchState?.phase === MatchPhase.VETO) {
      const isLastMap = matchState.remainingMaps.length === 1;
      const winningMap = isLastMap ? matchState.remainingMaps[0] : null;
      
      if (isLastMap && winningMap && !showCreatingMatch) {
        setShowCreatingMatch(true);
      } else if (!isLastMap) {
        setShowCreatingMatch(false);
      }
    } else {
      setShowCreatingMatch(false);
    }
  }, [matchState?.phase, matchState?.remainingMaps, showCreatingMatch]);

  // --- READY CHECK PHASE (centered modal, larger and more visible) ---
  if (matchState.phase === MatchPhase.READY_CHECK) {
      const hasAccepted = (matchState.readyPlayers || []).includes(currentUser.id);
      const readyCount = matchState.readyPlayers.length;

      const readyModal = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div
            className={`
              w-full max-w-lg rounded-2xl border-2 shadow-2xl overflow-hidden
              ${themeMode === 'dark' ? 'bg-black/60 border-white/10' : 'bg-white/80 border-black/10'}
              backdrop-blur-xl animate-in zoom-in duration-300
            `}
          >
            {/* Green progress bar at top - starts full and decreases from right to left (anchored left) */}
            <div className="h-1.5 bg-zinc-800 w-full relative">
              <div
                className="h-full bg-emerald-500 transition-all duration-50 ease-linear shadow-[0_0_10px_rgba(16,185,129,0.8)] absolute left-0 top-0"
                style={{ width: `${readyProgress}%` }}
              />
            </div>

            <div className="p-8 space-y-6">
              <h2 className="text-3xl font-display font-bold text-white tracking-tight text-center">MATCH FOUND</h2>

              <div className="flex justify-center space-x-1.5">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-5 h-14 rounded-sm transition-all duration-300 ${i < readyCount ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-zinc-800'}`}
                  />
                ))}
              </div>

              <p className="text-zinc-400 uppercase tracking-widest text-sm text-center">{readyCount} / 10 Players Ready</p>

              {!hasAccepted ? (
                <button
                  onClick={acceptMatch}
                  className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-lg uppercase tracking-widest rounded-xl shadow-lg hover:scale-[1.02] transition-all"
                >
                  ACCEPT MATCH
                </button>
              ) : (
                <div className="w-full py-5 bg-zinc-800 text-zinc-500 font-display font-bold text-base uppercase tracking-widest rounded-xl border border-white/5 cursor-wait text-center">
                  Waiting for players...
                </div>
              )}
            </div>
          </div>
        </div>
      );

      return createPortal(readyModal, document.body);
  }

  // --- MAIN LAYOUT ---
  // STRICT Height Calculation to prevent Body Scroll: 100vh - Header(80px) - Padding(approx 100px total vert)
  // We use 180px buffer. 
  return (
    <>
    <div className={`flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto h-[calc(100vh-180px)] overflow-hidden`}>
        
        {/* ⭐ NOVO: Botão Admin para sair da match */}
        {isAdmin && (
            <div className="absolute top-2 right-2 z-[70]">
                <button
                    onClick={() => setShowExitModal(true)}
                    className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white text-[10px] uppercase font-bold rounded-lg shadow-lg backdrop-blur-sm border border-rose-500/30 transition-all"
                >
                    [Admin] Exit to Lobby
                </button>
            </div>
        )}
        
        {/* Report Modal */}
        {reportModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <Card className="w-full max-w-md animate-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-display font-bold text-white">Report Player</h3>
                        <button onClick={() => setReportModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-xs uppercase text-zinc-500 mb-2">Reason</label>
                        <select 
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            className="report-reason-select w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white outline-none [&>option]:bg-zinc-800 [&>option]:text-zinc-200"
                        >
                            {reportReasons.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div className="flex space-x-4">
                        <Button variant="ghost" className="flex-1" onClick={() => setReportModalOpen(false)}>Cancel</Button>
                        <Button variant="danger" className="flex-1" onClick={submitReportReason}>Submit Report</Button>
                    </div>
                </Card>
            </div>
        )}

        {/* Mobile Tabs (Visible only on small screens) */}
        {!isFinished && (
            <div className="flex lg:hidden fixed bottom-4 left-4 right-4 z-50 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black/90 backdrop-blur-md">
                <button 
                    onClick={() => setActiveTab('game')} 
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'game' ? 'bg-rose-600 text-white' : 'text-zinc-500'}`}
                >
                    Game
                </button>
                <button 
                    onClick={() => setActiveTab('chat')} 
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'chat' ? 'bg-rose-600 text-white' : 'text-zinc-500'}`}
                >
                    Chat
                </button>
            </div>
        )}

        {/* LEFT: Game Content */}
        <div className={`flex-1 h-full flex flex-col relative ${activeTab === 'chat' && !isFinished ? 'hidden lg:flex' : 'flex'}`}>
            
            {/* --- PHASE: DRAFT (LOCKED LAYOUT) --- */}
            {matchState.phase === MatchPhase.DRAFT && (
                <div className="h-full flex flex-col animate-in fade-in duration-500 overflow-hidden">
                    {/* Header Fixed Height */}
                    <div className="flex-none h-24 flex flex-col justify-center items-center text-center space-y-1 mb-2">
                        <h2 className={`text-3xl font-display font-bold uppercase tracking-widest ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>Player Draft</h2>
                        <div className="h-6 flex items-center justify-center w-full"> {/* Reserved space for status to prevent jump */}
                            {isMyTurn ? (
                                <div className="px-4 py-0.5 bg-rose-500 text-white text-[10px] uppercase font-bold rounded-full animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.5)]">
                                    YOUR PICK
                                </div>
                            ) : (
                                <div className="px-4 py-0.5 bg-zinc-600 text-white text-[10px] uppercase font-bold rounded-full opacity-70">
                                    OPPONENT PICKING...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Grid: Fixed Height, 3 Columns */}
                    <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden p-1">
                        
                        {/* Team A (Left) */}
                        <Card className="col-span-3 h-full flex flex-col border-l-4 border-l-emerald-500/50" noPadding>
                            <div className="p-4 border-b border-white/5 bg-emerald-500/5">
                                <h3 className="text-emerald-400 font-display font-bold uppercase tracking-widest text-xs truncate">Team {matchState.captainA?.username}</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {matchState.teamA.map(u => (
                                    <div key={u.id} className={`flex items-center p-2 rounded-lg ${themeMode === 'dark' ? 'bg-white/5' : 'bg-black/5'} animate-in slide-in-from-left-2`}>
                                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-emerald-900/50 text-white rounded-full text-[10px] mr-2 overflow-hidden">
                                            {u.avatarUrl ? (
                                                <img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover" />
                                            ) : (
                                                u.username[0].toUpperCase()
                                            )}
                                        </div>
                                        <span className={`text-xs font-bold truncate ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>{u.username}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Pool (Center) */}
                        <div className="col-span-6 h-full flex flex-col">
                            <div className="flex-none mb-2 flex justify-between items-end px-2">
                                <span className="text-xs uppercase text-zinc-500 tracking-widest">Available Players</span>
                                <span className="text-xs font-mono text-zinc-500">{matchState.remainingPool.length} Remaining</span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {matchState.remainingPool.map(player => (
                                        <button
                                            key={player.id}
                                            disabled={!isMyTurn}
                                            onClick={() => draftPlayer(player)}
                                            className={`
                                                flex items-center p-3 rounded-xl border transition-all duration-200 group relative overflow-hidden
                                                ${isMyTurn 
                                                    ? 'bg-white/5 border-white/10 hover:border-rose-500 hover:bg-rose-500/10 cursor-pointer shadow-md hover:shadow-rose-500/20' 
                                                    : `opacity-40 cursor-not-allowed ${themeMode === 'dark' ? 'bg-black/20 border-white/5' : 'bg-black/5 border-black/5'}`}
                                            `}
                                        >
                                            <div className="relative z-10 flex items-center w-full">
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white mr-3 border border-white/10">
                                                    {player.avatarUrl ? <img src={player.avatarUrl} className="w-full h-full object-cover rounded-full" /> : player.username[0]}
                                                </div>
                                                <div className="flex flex-col items-start min-w-0">
                                                    <span className={`text-sm font-bold truncate w-full text-left ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>{player.username}</span>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-[10px] text-zinc-500 uppercase">{player.primaryRole}</span>
                                                        <span className="text-[10px] font-mono text-zinc-600 bg-white/5 px-1 rounded">{Math.floor(player.points)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Hover Effect Background */}
                                            {isMyTurn && <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/0 to-rose-500/5 group-hover:via-rose-500/10 transition-all"></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Team B (Right) */}
                        <Card className="col-span-3 h-full flex flex-col border-r-4 border-r-rose-500/50" noPadding>
                            <div className="p-4 border-b border-white/5 bg-rose-500/5 text-right">
                                <h3 className="text-rose-400 font-display font-bold uppercase tracking-widest text-xs truncate">Team {matchState.captainB?.username}</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {matchState.teamB.map(u => (
                                    <div key={u.id} className={`flex flex-row-reverse items-center p-2 rounded-lg ${themeMode === 'dark' ? 'bg-white/5' : 'bg-black/5'} animate-in slide-in-from-right-2`}>
                                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-rose-900/50 text-white rounded-full text-[10px] ml-2 overflow-hidden">
                                            {u.avatarUrl ? (
                                                <img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover" />
                                            ) : (
                                                u.username[0].toUpperCase()
                                            )}
                                        </div>
                                        <span className={`text-xs font-bold truncate ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>{u.username}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                    </div>
                </div>
            )}

            {/* --- PHASE: VETO (LOCKED LAYOUT) --- */}
            {matchState.phase === MatchPhase.VETO && (() => {
                const bannedMaps = matchState.bannedMaps || [];
                // Get all maps from constants to show complete list
                const allMaps = MAPS; // Show all maps
                const isLastMap = matchState.remainingMaps.length === 1;
                const winningMap = isLastMap ? matchState.remainingMaps[0] : null;

                return (
                    <div className="h-full flex flex-col animate-in fade-in duration-500 overflow-hidden">
                        {/* "Creating match..." overlay when last map is selected */}
                        {showCreatingMatch && winningMap && (
                            <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                                <div className="text-center space-y-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-4 border-emerald-500 flex items-center justify-center mx-auto animate-pulse">
                                            <Check className="w-12 h-12 text-emerald-400" />
                                        </div>
                                    </div>
                                    <h2 className="text-4xl font-display font-bold text-white tracking-tighter">
                                        {winningMap}
                                    </h2>
                                    <p className="text-xl text-zinc-400 uppercase tracking-widest animate-pulse">
                                        Creating match...
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex-none h-24 flex flex-col justify-center items-center text-center space-y-1 mb-2">
                            <h2 className={`text-3xl font-display font-bold uppercase tracking-widest ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>Map Veto</h2>
                            <div className="h-6 flex items-center justify-center w-full">
                                {isMyTurn && !isLastMap ? (
                                    <div className="px-4 py-0.5 bg-red-500 text-white text-[10px] uppercase font-bold rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                        BAN A MAP
                                    </div>
                                ) : isLastMap ? (
                                    <div className="px-4 py-0.5 bg-emerald-500 text-white text-[10px] uppercase font-bold rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                        MAP SELECTED
                                    </div>
                                ) : (
                                    <div className="px-4 py-0.5 bg-zinc-600 text-white text-[10px] uppercase font-bold rounded-full opacity-70">
                                        OPPONENT BANNING...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Veto Grid: Show all maps (remaining + banned) */}
                        <div className="flex-1 p-4 flex items-center justify-center overflow-hidden">
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full max-w-5xl">
                                {allMaps.map(map => {
                                    const bannedInfo = bannedMaps.find(b => b.map === map);
                                    const isBanned = !!bannedInfo;
                                    const isRemaining = matchState.remainingMaps.includes(map);
                                    const isWinning = map === winningMap;

                                    return (
                                        <div
                                            key={map}
                                            className={`
                                                relative group overflow-hidden rounded-xl border transition-all duration-300
                                                aspect-[16/9] flex flex-col items-center justify-center
                                                ${isBanned 
                                                    ? 'border-red-500/50 opacity-60 cursor-not-allowed grayscale' 
                                                    : isWinning
                                                    ? 'border-emerald-500 ring-4 ring-emerald-500/50 cursor-default'
                                                    : isMyTurn && isRemaining
                                                    ? 'border-zinc-500/20 hover:border-red-500 hover:scale-105 cursor-pointer shadow-lg'
                                                    : 'opacity-40 grayscale cursor-not-allowed border-transparent'}
                                            `}
                                        >
                                            {!isBanned && isRemaining && (
                                                <button
                                                    disabled={!isMyTurn}
                                                    onClick={() => vetoMap(map)}
                                                    className="absolute inset-0 w-full h-full"
                                                />
                                            )}
                                            
                                            <img 
                                                src={MAP_IMAGES[map]} 
                                                alt={map}
                                                className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                                                    isBanned ? 'opacity-30' : isWinning ? 'opacity-80' : 'opacity-60 group-hover:opacity-40'
                                                }`}
                                            />
                                            <div className={`absolute inset-0 transition-colors ${
                                                isBanned 
                                                    ? 'bg-red-900/80' 
                                                    : isWinning
                                                    ? 'bg-emerald-900/40'
                                                    : 'bg-black/60 group-hover:bg-red-900/60'
                                            }`}></div>

                                            <div className="relative z-10 flex flex-col items-center px-2">
                                                {isWinning ? (
                                                    <>
                                                        <Check className="w-8 h-8 mb-1 text-emerald-400 animate-pulse" />
                                                        <span className="text-xs font-display tracking-widest uppercase font-bold text-white shadow-black drop-shadow-md text-center">{map}</span>
                                                    </>
                                                ) : isBanned ? (
                                                    <>
                                                        <Ban className="w-6 h-6 mb-1 text-red-400" />
                                                        <span className="text-xs font-display tracking-widest uppercase font-bold text-white shadow-black drop-shadow-md text-center">{map}</span>
                                                        <span className="text-[10px] text-red-300 mt-1 text-center">BANNED</span>
                                                        <span className="text-[9px] text-zinc-400 mt-0.5 text-center">by {bannedInfo.bannedByName}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Ban className={`w-6 h-6 mb-1 ${isMyTurn && isRemaining ? 'text-zinc-300 group-hover:text-white group-hover:scale-110 transition-transform' : 'text-zinc-500'}`} />
                                                        <span className={`text-xs font-display tracking-widest uppercase font-bold text-white shadow-black drop-shadow-md`}>{map}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* --- PHASE: LIVE (LAYOUT INSPIRADO NA IMAGEM) --- */}
            {matchState.phase === MatchPhase.LIVE && (
                <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-700 max-w-6xl mx-auto w-full p-2 overflow-hidden">
                        {/* Map + Teams + Match Code */}
                        <div className="relative rounded-3xl overflow-hidden border border-white/5 py-8 px-6 md:px-10 bg-black shrink-0">
                            {matchState.selectedMap && (
                                <div 
                                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 pointer-events-none"
                                    style={{ backgroundImage: `url(${MAP_IMAGES[matchState.selectedMap]})` }}
                                ></div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-black pointer-events-none"></div>

                            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                                {/* Left Team */}
                                <div className="text-center lg:text-left w-full lg:w-1/3 space-y-1">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400">Defense</p>
                                    <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                                        {matchState.captainA?.username || 'Team A'}
                                    </h2>
                                    <p className="text-[11px] text-zinc-400 uppercase tracking-[0.25em] mt-2">
                                        Team Avg: <span className="text-emerald-400 font-semibold">{String(avgRankA).toUpperCase()}</span>
                                    </p>
                                </div>

                                {/* Center - Map */}
                                <div className="flex flex-col items-center space-y-4 w-full lg:w-1/3">
                                    <div className="flex flex-col items-center space-y-1">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] uppercase tracking-[0.25em] text-emerald-300">
                                            Map Selected
                                        </span>
                                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.7)]">
                                            {matchState.selectedMap || 'MAP'}
                                        </h1>
                                        <p className="text-[11px] text-zinc-400 uppercase tracking-[0.25em] flex items-center gap-2 mt-1">
                                            <Clock className="w-3 h-3" />
                                            <span>Time Elapsed: {formatTime(timeLeft)}</span>
                                        </p>
                                    </div>

                                </div>

                                {/* Right Team */}
                                <div className="text-center lg:text-right w-full lg:w-1/3 space-y-1">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400">Attack</p>
                                    <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                                        {matchState.captainB?.username || 'Team B'}
                                    </h2>
                                    <p className="text-[11px] text-zinc-400 uppercase tracking-[0.25em] mt-2">
                                        Team Avg: <span className="text-rose-400 font-semibold">{String(avgRankB).toUpperCase()}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Players List Grid (Fixed, only internal scroll if needed) */}
                        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 min-h-0">
                            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2">
                                <div className="md:hidden text-center text-emerald-500 font-bold uppercase tracking-widest text-xs mb-2">Team {matchState.captainA?.username}</div>
                                {matchState.teamA.map(player => (
                                    <div key={player.id} className="flex items-center justify-between p-3 border-b border-emerald-500/10 bg-emerald-500/5 md:bg-transparent rounded-lg md:rounded-none">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white overflow-hidden border border-emerald-500/30">
                                                {player.avatarUrl ? (
                                                    <img src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs">{player.username[0].toUpperCase()}</span>
                                                )}
                                            </div>
                                            {matchState.captainA?.id === player.id && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                                            <span className={`font-display text-lg ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>{player.username}</span>
                                        </div>
                                        <span className="text-xs text-zinc-500">{getRankInfo(player.points).name}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2 md:text-right overflow-y-auto custom-scrollbar pl-2">
                                <div className="md:hidden text-center text-rose-500 font-bold uppercase tracking-widest text-xs mb-2 mt-4">Team {matchState.captainB?.username}</div>
                                {matchState.teamB.map(player => (
                                    <div key={player.id} className="flex items-center justify-between md:flex-row-reverse p-3 border-b border-rose-500/10 bg-rose-500/5 md:bg-transparent rounded-lg md:rounded-none">
                                        <div className="flex items-center space-x-3 md:flex-row-reverse md:space-x-reverse md:space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white overflow-hidden border border-rose-500/30">
                                                {player.avatarUrl ? (
                                                    <img src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs">{player.username[0].toUpperCase()}</span>
                                                )}
                                            </div>
                                            {matchState.captainB?.id === player.id && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                                            <span className={`font-display text-lg ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>{player.username}</span>
                                        </div>
                                        <span className="text-xs text-zinc-500">{getRankInfo(player.points).name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Match Control / Match Panel (collapsible) */}
                        <Card className="flex flex-col items-center py-3 shrink-0 max-h-[400px] overflow-y-auto custom-scrollbar">
                            <div className="w-full flex items-center justify-between px-4">
                              <h3 className="uppercase tracking-widest text-zinc-400 text-[11px]">Match Panel</h3>
                              <button
                                type="button"
                                onClick={() => setMatchPanelOpen(o => !o)}
                                className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors"
                              >
                                {matchPanelOpen ? 'Hide' : 'Show'}
                              </button>
                            </div>

                            {!matchPanelOpen ? null : !canReport ? (
                                <div className="w-full max-w-md flex flex-col items-center text-center space-y-5 pt-3 px-4">
                                    <div className="flex flex-col items-center space-y-3">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center">
                                            <Lock className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className={`text-xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                                                Match Code
                                            </p>
                                            <p className="text-sm text-zinc-500">
                                                Captains can set the lobby code. Everyone can copy it.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Code Input/Display - lobby code centered, save/copy icons to the right */}
                                    {isCaptain ? (
                                        <div className="flex items-center justify-center gap-3 w-full max-w-md mx-auto">
                                            <button
                                                type="button"
                                                aria-label="Save match code"
                                                title="Save"
                                                onClick={async () => {
                                                    const trimmed = localMatchCode.trim().toUpperCase();
                                                    if (!trimmed || !matchState?.id) return;
                                                    try {
                                                        if ((matchState.matchCode || '').trim() !== trimmed) {
                                                            await updateDoc(doc(db, 'active_matches', matchState.id), { matchCode: trimmed });
                                                        }
                                                        setLocalMatchCode(trimmed);
                                                        showToast('Match code saved', 'success');
                                                    } catch (e) {
                                                        console.warn('Failed to save match code', e);
                                                        showToast('Failed to save match code', 'error');
                                                    }
                                                }}
                                                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 grid place-items-center"
                                            >
                                                <Save className="w-4 h-4 text-zinc-200" />
                                            </button>
                                            <input
                                                type="text"
                                                value={localMatchCode}
                                                onChange={(e) => {
                                                    const filtered = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                                                    setLocalMatchCode(filtered);
                                                }}
                                                placeholder="Lobby code"
                                                className="w-[220px] bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-base text-white outline-none focus:border-emerald-400 font-mono tracking-[0.25em] text-center"
                                            />
                                            <button
                                                type="button"
                                                aria-label="Copy match code"
                                                title="Copy"
                                                onClick={async () => {
                                                    const code = (localMatchCode || matchState.matchCode || '').trim();
                                                    if (!code) return;
                                                    try {
                                                        await navigator.clipboard.writeText(code);
                                                        showToast('Match code copied to clipboard', 'success');
                                                    } catch {
                                                        showToast('Failed to copy match code', 'error');
                                                    }
                                                }}
                                                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 grid place-items-center"
                                            >
                                                <Copy className="w-4 h-4 text-zinc-200" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-3 w-full max-w-md mx-auto">
                                            <div className="w-10 h-10" />
                                            <div className="w-[220px] bg-black/40 border border-white/10 rounded-2xl px-4 py-3 font-mono text-base tracking-[0.25em] text-zinc-200 text-center">
                                                {matchState.matchCode ? matchState.matchCode : 'WAITING...'}
                                            </div>
                                            <button
                                                type="button"
                                                aria-label="Copy match code"
                                                title={matchState.matchCode ? 'Copy' : 'Waiting for code'}
                                                disabled={!matchState.matchCode}
                                                onClick={async () => {
                                                    if (!matchState.matchCode) return;
                                                    try {
                                                        await navigator.clipboard.writeText(matchState.matchCode);
                                                        showToast('Match code copied to clipboard', 'success');
                                                    } catch {
                                                        showToast('Failed to copy match code', 'error');
                                                    }
                                                }}
                                                className={`w-10 h-10 rounded-xl border grid place-items-center transition-colors justify-self-end ${
                                                    matchState.matchCode
                                                        ? 'bg-white/5 hover:bg-white/10 border-white/10'
                                                        : 'bg-white/0 border-white/5 opacity-40 cursor-not-allowed'
                                                }`}
                                            >
                                                <Copy className="w-4 h-4 text-zinc-200" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Countdown (bigger + green) - centered, text above time */}
                                    {(() => {
                                        const remainingMs = Math.max(0, (20 * 60 * 1000) - timeLeft);
                                        const mins = Math.floor(remainingMs / 60000);
                                        const secs = Math.floor((remainingMs % 60000) / 1000);
                                        const t = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                                        return (
                                            <div className="pt-2 flex flex-col items-center">
                                                <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-400/80 font-semibold mb-1">
                                                    Result reporting unlocks in
                                                </div>
                                                <div className="text-emerald-400 font-mono font-bold text-2xl md:text-3xl">
                                                    {t}
                                                </div>
                                                {isAdmin && (
                                                    <Button variant="ghost" size="sm" onClick={forceTimePass} className="mt-3">
                                                        [Admin] Skip Time
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-4 text-center pt-3 px-4">
                                    {/* Verificar se jogador já reportou */}
                                    {(matchState.playerReports || []).some(r => r.playerId === currentUser.id) ? (
                                        // ⭐ Jogador já reportou - mostrar status de verificação
                                        <div className="space-y-4">
                                            <div className="flex flex-col items-center space-y-3">
                                                {/* Loading Spinner */}
                                                <div className="relative">
                                                    <div className="w-16 h-16 border-4 border-zinc-800 border-t-rose-500 rounded-full animate-spin"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Trophy className="w-6 h-6 text-rose-500" />
                                                    </div>
                                                </div>
                                                
                                                <div className="text-center">
                                                    <p className={`text-lg font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                                                        Verification in Progress
                                                    </p>
                                                    <p className="text-sm text-zinc-500">
                                                        Waiting for other players to report...
                                                    </p>
                                                    <p className="text-xs text-rose-500 font-bold mt-2">
                                                        {(matchState.playerReports || []).length} / 3 players voted
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Mostrar quem já votou e o que votaram - centered */}
                                            <div className="space-y-2 mt-6 w-full max-w-sm mx-auto">
                                                <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Votes Submitted:</p>
                                                <div className="space-y-2">
                                                    {(matchState.playerReports || []).map((report, index) => (
                                                        <div 
                                                            key={index}
                                                            className={`flex items-center justify-between p-2 rounded-lg ${themeMode === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}
                                                        >
                                                            <div className="flex items-center space-x-2">
                                                                <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
                                                                    <User className="w-3 h-3 text-rose-500" />
                                                                </div>
                                                                <span className="text-sm font-bold">{report.playerName}</span>
                                                            </div>
                                                            <span className="text-sm font-mono font-bold text-zinc-400">
                                                                {report.scoreA} - {report.scoreB}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* ⭐ Análise de consenso */}
                                            {(() => {
                                                const voteCounts = new Map<string, number>();
                                                (matchState.playerReports || []).forEach(r => {
                                                    const key = `${r.scoreA}-${r.scoreB}`;
                                                    voteCounts.set(key, (voteCounts.get(key) || 0) + 1);
                                                });
                                                
                                                const maxVotes = Math.max(...Array.from(voteCounts.values()));
                                                const leadingResult = Array.from(voteCounts.entries())
                                                    .find(([_, count]) => count === maxVotes);
                                                
                                                if (leadingResult && maxVotes >= 2) {
                                                    return (
                                                        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg w-full max-w-sm mx-auto">
                                                            <p className="text-xs text-rose-500 font-bold">
                                                                Leading Result: {leadingResult[0]} ({maxVotes} votes)
                                                            </p>
                                                            {maxVotes < 3 && (
                                                                <p className="text-xs text-zinc-500 mt-1">
                                                                    Need {3 - maxVotes} more vote{3 - maxVotes > 1 ? 's' : ''} to confirm
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    ) : (
                                        // ⭐ Jogador ainda não reportou - mostrar form
                                        <>
                                            <p className={`text-lg ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>Final Score</p>
                                            <div className="flex items-center justify-center space-x-4">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs text-zinc-500 mb-1">Team {matchState.captainA?.username}</span>
                                                        <input 
                                                            type="number"
                                                            value={scoreA}
                                                            onChange={(e) => setScoreA(e.target.value)}
                                                            className={`w-16 h-16 text-center text-3xl font-bold rounded-2xl outline-none border focus:border-rose-500 ${themeMode === 'dark' ? 'bg-black/20 border-white/10 text-white' : 'bg-zinc-100 border-zinc-200 text-black'}`}
                                                        />
                                                    </div>
                                                    <span className="text-xl text-zinc-500 font-bold">:</span>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs text-zinc-500 mb-1">Team {matchState.captainB?.username}</span>
                                                        <input 
                                                            type="number"
                                                            value={scoreB}
                                                            onChange={(e) => setScoreB(e.target.value)}
                                                            className={`w-16 h-16 text-center text-3xl font-bold rounded-2xl outline-none border focus:border-rose-500 ${themeMode === 'dark' ? 'bg-black/20 border-white/10 text-white' : 'bg-zinc-100 border-zinc-200 text-black'}`}
                                                        />
                                                    </div>
                                            </div>

                                            {/* Mostrar votos já existentes antes de submeter - centered */}
                                            {(matchState.playerReports || []).length > 0 && (
                                                <div className="mt-4 p-3 bg-zinc-900/50 rounded-lg border border-white/5 w-full max-w-sm mx-auto">
                                                    <p className="text-xs text-zinc-500 mb-2">{(matchState.playerReports || []).length} player{(matchState.playerReports || []).length > 1 ? 's' : ''} already voted:</p>
                                                    <div className="space-y-1">
                                                        {(matchState.playerReports || []).map((report, index) => (
                                                            <div key={index} className="text-xs text-zinc-400">
                                                                <span className="font-bold">{report.playerName}</span>: {report.scoreA} - {report.scoreB}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {reportError && (
                                                <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg flex items-center justify-center">
                                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                                    {reportError}
                                                </div>
                                            )}

                                            <Button 
                                                variant="primary" 
                                                className="w-full max-w-xs mx-auto mt-2"
                                                onClick={handleReportSubmit}
                                            >
                                                Submit Result
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                        </Card>
                </div>
            )}

            {/* --- PHASE: FINISHED (SCROLLABLE) --- */}
            {matchState.phase === MatchPhase.FINISHED && (
                <div className="h-full overflow-y-auto custom-scrollbar flex flex-col items-center space-y-12 animate-in zoom-in duration-500 pt-12 pb-24 w-full">
                        <div className="text-center">
                            <Trophy className={`w-24 h-24 mx-auto ${matchState.winner === userTeam ? 'text-emerald-500' : 'text-rose-500'}`} />
                            <h1 className={`text-8xl font-display font-bold mt-6 mb-4 tracking-tighter ${resultColor}`}>{resultTitle}</h1>
                            
                            {/* Points Gained/Lost Display — usar breakdown quando existir, senão currentUser (para todos os jogadores) */}
                            {(() => {
                                const myChange = matchState.playerPointsChanges?.find(p => p.playerId === currentUser.id);
                                const pointsChange = myChange?.pointsChange ?? currentUser.lastPointsChange;
                                if (pointsChange === undefined) return null;
                                return (
                                    <div className={`text-2xl font-bold font-mono mb-4 ${pointsChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {pointsChange >= 0 ? '+' : ''}{pointsChange} MMR
                                    </div>
                                );
                            })()}

                            <p className="text-2xl text-zinc-400 font-bold tracking-widest">WINNER: TEAM {matchState.winner === 'A' ? matchState.captainA?.username.toUpperCase() : matchState.captainB?.username.toUpperCase()}</p>
                            <div className="mt-6 text-6xl font-mono font-bold text-white bg-white/5 px-8 py-4 rounded-3xl border border-white/10">
                                {matchState.reportA ? `${matchState.reportA.scoreA} - ${matchState.reportA.scoreB}` : ''}
                            </div>
                        </div>

                        {/* Points Breakdown + Commend/Report - teams left/right, inline actions */}
                        {matchState.playerPointsChanges && matchState.playerPointsChanges.length > 0 && (
                            <Card className="w-full max-w-5xl">
                                <div className="flex items-center space-x-2 mb-6 text-zinc-400">
                                    <Trophy className="w-5 h-5" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest">Points Breakdown</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Team A - Left */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-3">Team {matchState.captainA?.username}</h4>
                                        {teamA.map(player => {
                                            const change = matchState.playerPointsChanges?.find(p => p.playerId === player.id);
                                            const isSelf = player.id === currentUser.id;
                                            return (
                                                <div 
                                                    key={player.id} 
                                                    className={`flex items-center justify-between gap-2 p-3 rounded-xl border ${
                                                        change?.isWinner 
                                                            ? 'bg-emerald-500/10 border-emerald-500/20' 
                                                            : 'bg-rose-500/10 border-rose-500/20'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center overflow-hidden text-white text-xs font-bold">
                                                            {player.avatarUrl ? <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" /> : player.username[0].toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <span className={`font-bold text-sm truncate block ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>{player.username}</span>
                                                            {change && (
                                                                <span className={`text-[10px] font-mono ${change.pointsChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    {change.pointsChange >= 0 ? '+' : ''}{change.pointsChange} · Total: {change.newTotal}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {!isSelf && (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button 
                                                                onClick={() => handleCommend(player.id)}
                                                                disabled={(matchInteractions || []).includes(player.id)}
                                                                className={`p-1.5 rounded-lg transition-colors ${(matchInteractions || []).includes(player.id) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-emerald-500/20 text-emerald-500'}`}
                                                                title="Commend"
                                                            >
                                                                <ThumbsUp className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => openReportModal(player.id)}
                                                                disabled={(matchInteractions || []).includes(player.id)}
                                                                className={`p-1.5 rounded-lg transition-colors ${(matchInteractions || []).includes(player.id) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-red-500/20 text-red-500'}`}
                                                                title="Report"
                                                            >
                                                                <Flag className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Team B - Right */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs uppercase tracking-widest text-rose-400 font-bold mb-3">Team {matchState.captainB?.username}</h4>
                                        {teamB.map(player => {
                                            const change = matchState.playerPointsChanges?.find(p => p.playerId === player.id);
                                            const isSelf = player.id === currentUser.id;
                                            return (
                                                <div 
                                                    key={player.id} 
                                                    className={`flex items-center justify-between gap-2 p-3 rounded-xl border ${
                                                        change?.isWinner 
                                                            ? 'bg-emerald-500/10 border-emerald-500/20' 
                                                            : 'bg-rose-500/10 border-rose-500/20'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center overflow-hidden text-white text-xs font-bold">
                                                            {player.avatarUrl ? <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" /> : player.username[0].toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <span className={`font-bold text-sm truncate block ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>{player.username}</span>
                                                            {change && (
                                                                <span className={`text-[10px] font-mono ${change.pointsChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    {change.pointsChange >= 0 ? '+' : ''}{change.pointsChange} · Total: {change.newTotal}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {!isSelf && (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button 
                                                                onClick={() => handleCommend(player.id)}
                                                                disabled={(matchInteractions || []).includes(player.id)}
                                                                className={`p-1.5 rounded-lg transition-colors ${(matchInteractions || []).includes(player.id) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-emerald-500/20 text-emerald-500'}`}
                                                                title="Commend"
                                                            >
                                                                <ThumbsUp className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => openReportModal(player.id)}
                                                                disabled={(matchInteractions || []).includes(player.id)}
                                                                className={`p-1.5 rounded-lg transition-colors ${(matchInteractions || []).includes(player.id) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-red-500/20 text-red-500'}`}
                                                                title="Report"
                                                            >
                                                                <Flag className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </Card>
                        )}

                        <div className="text-center">
                            <Button onClick={resetMatch} size="lg">Return to Lobby</Button>
                        </div>
                </div>
            )}
        </div>

        {/* RIGHT: Lobby Chat (Fixed Height, visible on desktop) */}
        {!isFinished && (
            <div className={`
                w-full lg:w-80 flex-shrink-0 flex flex-col rounded-3xl overflow-hidden border 
                ${themeMode === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-black/5'} 
                h-full
                ${activeTab === 'game' ? 'hidden lg:flex' : 'flex'}
            `}>
                <div className={`p-4 border-b ${themeMode === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'} flex items-center`}>
                    <MessageSquare className="w-4 h-4 mr-2 text-rose-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Lobby Chat</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {matchState.chat.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.isSystem ? 'items-center' : (msg.senderId === currentUser.id ? 'items-end' : 'items-start')}`}>
                            {msg.isSystem ? (
                                <div className={`text-[10px] bg-white/5 text-zinc-500 px-2 py-1 rounded-full mb-1 font-bold`}>{msg.text}</div>
                            ) : (
                                <>
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className="text-[10px] text-zinc-500 font-bold">{msg.senderName}</span>
                                        <span className="text-[9px] text-zinc-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] ${msg.senderId === currentUser.id ? 'bg-rose-500 text-white' : (themeMode === 'dark' ? 'bg-white/10 text-white' : 'bg-zinc-200 text-black')}`}>
                                        {msg.text}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className={`p-3 border-t ${themeMode === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Type a message..."
                            className={`w-full rounded-xl pl-4 pr-10 py-3 text-sm outline-none transition-all ${themeMode === 'dark' ? 'bg-black/40 text-white focus:bg-black/60' : 'bg-zinc-100 text-black focus:bg-white border'}`}
                        />
                        <button type="submit" className="absolute right-2 top-2 p-1 text-rose-500 hover:text-rose-400 transition-colors">
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        )}

    </div>
    <Modal
      isOpen={showExitModal}
      onClose={() => setShowExitModal(false)}
      title="Exit Match"
      message="Are you sure you want to leave this match? The match will be deleted."
      confirmText="Exit"
      cancelText="Cancel"
      onConfirm={() => {
        exitMatchToLobby();
        setShowExitModal(false);
      }}
      variant="warning"
    />
    </>
  );
};

export default MatchInterface;
