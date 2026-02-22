
import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { QUEST_POOL } from '../constants';
import { getLevelProgress } from '../services/gameService';
import Card from './ui/Card';
import Button from './ui/Button';
import { Check, Lock, Zap, Clock, Star, Trophy, Target, Calendar, Sparkles, Flame, Crown, Gem, Rocket, Filter, TrendingUp, User } from 'lucide-react';
import { Quest, UserQuest } from '../types';

const QuestsView = () => {
    const { currentUser, claimQuestReward, themeMode, isAdmin, resetDailyQuests } = useGame();
    const [loadingQuestId, setLoadingQuestId] = useState<string | null>(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'DAILY' | 'MONTHLY' | 'UNIQUE'>('ALL');
    const [isLoading, setIsLoading] = useState(true);

    const totalXP = currentUser.xp || 0;
    const { level: displayLevel, currentLevelXP, xpForNextLevel } = getLevelProgress(totalXP);
    const xpProgress = Math.min(100, (currentLevelXP / xpForNextLevel) * 100);
    const xpNeeded = Math.max(0, xpForNextLevel - currentLevelXP);

    // Simulate loading
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1200); // 1.2 seconds loading
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                        Loading Quests...
                    </h3>
                    <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                        Please wait while we fetch your active quests
                    </p>
                </div>
            </div>
        );
    }

    if (!currentUser.activeQuests || currentUser.activeQuests.length === 0) {
        return (
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                <div className="text-center py-20">
                    <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
                        themeMode === 'dark' ? 'bg-zinc-800/50' : 'bg-zinc-100'
                    }`}>
                        <Target className={`w-12 h-12 ${themeMode === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`} />
                    </div>
                    <h3 className={`text-2xl font-bold mb-2 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                        No Active Quests
                    </h3>
                    <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                        Check back soon for new challenges and rewards!
                    </p>
                </div>
            </div>
        );
    }

    // Sort: Daily -> Monthly -> Unique
    const sortedQuests = [...currentUser.activeQuests].sort((a, b) => {
        const qA = QUEST_POOL.find(q => q.id === a.questId);
        const qB = QUEST_POOL.find(q => q.id === b.questId);
        if (!qA || !qB) return 0;

        const order = { 'DAILY': 1, 'MONTHLY': 2, 'UNIQUE': 3 };
        return order[qA.category] - order[qB.category];
    });

    // Filter quests based on selected filter
    const filteredQuests = selectedFilter === 'ALL' 
        ? sortedQuests 
        : sortedQuests.filter(q => {
            const questDef = QUEST_POOL.find(quest => quest.id === q.questId);
            return questDef?.category === selectedFilter;
        });

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'DAILY': return <Zap className="w-4 h-4" />;
            case 'MONTHLY': return <Calendar className="w-4 h-4" />;
            case 'UNIQUE': return <Trophy className="w-4 h-4" />;
            default: return <Star className="w-4 h-4" />;
        }
    };

    const getCategoryGradient = (cat: string) => {
        switch (cat) {
            case 'DAILY': return 'from-rose-500/20 to-orange-500/20 border-rose-500/30';
            case 'MONTHLY': return 'from-purple-500/20 to-blue-500/20 border-purple-500/30';
            case 'UNIQUE': return 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30';
            default: return 'from-zinc-500/20 to-gray-500/20 border-zinc-500/30';
        }
    };

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'DAILY': return 'text-rose-400';
            case 'MONTHLY': return 'text-purple-400';
            case 'UNIQUE': return 'text-emerald-400';
            default: return 'text-zinc-400';
        }
    };

    const handleReset = () => {
        setShowResetModal(true);
    };

    const confirmReset = () => {
        resetDailyQuests();
        setShowResetModal(false);
    };

    const filterButtons = [
        { id: 'ALL', label: 'All', count: sortedQuests.length },
        { id: 'DAILY', label: 'Daily', count: sortedQuests.filter(q => QUEST_POOL.find(quest => quest.id === q.questId)?.category === 'DAILY').length },
        { id: 'MONTHLY', label: 'Monthly', count: sortedQuests.filter(q => QUEST_POOL.find(quest => quest.id === q.questId)?.category === 'MONTHLY').length },
        { id: 'UNIQUE', label: 'Unique', count: sortedQuests.filter(q => QUEST_POOL.find(quest => quest.id === q.questId)?.category === 'UNIQUE').length },
    ] as const;

    return (
        <>
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className={`text-4xl lg:text-5xl font-display font-bold tracking-tight ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                            Quests
                        </h1>
                        <p className="text-zinc-500 mt-2 font-medium">
                            Complete challenges and earn rewards
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            themeMode === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                        }`}>
                            <Target className="w-4 h-4 inline mr-1" />
                            {currentUser.activeQuests.length} Active
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            themeMode === 'dark' ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'
                        }`}>
                            <Sparkles className="w-4 h-4 inline mr-1" />
                            {currentUser.activeQuests.filter(q => q.completed && !q.claimed).length} Ready
                        </div>
                    </div>
                </div>

                {/* Quest Summary Card */}
                <Card className={`mb-8 relative overflow-hidden ${
                    themeMode === 'dark' 
                        ? 'bg-[#0a0a0a] border-white/5' 
                        : 'bg-white border-zinc-200'
                } shadow-lg`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-rose-500/5"></div>
                    
                    <div className="relative p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Level Section */}
                            <div className="text-center">
                                <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
                                    themeMode === 'dark' ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20' : 'bg-gradient-to-br from-purple-100 to-blue-100'
                                }`}>
                                    <User className={`w-8 h-8 ${themeMode === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                                </div>
                                <h3 className={`text-2xl font-bold mb-1 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                                    Level {displayLevel}
                                </h3>
                                <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                    Current Rank
                                </p>
                            </div>

                            {/* XP Progress Section */}
                            <div className="text-center">
                                <div className="mb-3">
                                    <div className={`text-2xl font-bold mb-1 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                                        {totalXP} XP
                                    </div>
                                    <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                        {xpNeeded} XP to next level
                                    </p>
                                </div>
                                <div className={`w-full h-3 rounded-full overflow-hidden ${
                                    themeMode === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'
                                }`}>
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000"
                                        style={{ width: `${xpProgress}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Quest Stats Section */}
                            <div className="text-center">
                                <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
                                    themeMode === 'dark' ? 'bg-gradient-to-br from-rose-500/20 to-orange-500/20' : 'bg-gradient-to-br from-rose-100 to-orange-100'
                                }`}>
                                    <Trophy className={`w-8 h-8 ${themeMode === 'dark' ? 'text-rose-400' : 'text-rose-600'}`} />
                                </div>
                                <h3 className={`text-2xl font-bold mb-1 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                                    {currentUser.activeQuests.filter(q => q.completed).length}
                                </h3>
                                <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                    Quests Completed
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Filter Buttons */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className={`w-4 h-4 ${themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`} />
                        <span className={`text-sm font-medium ${themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            Filter Quests
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {filterButtons.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setSelectedFilter(filter.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    selectedFilter === filter.id
                                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                                        : themeMode === 'dark'
                                            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                                }`}
                            >
                                {filter.label}
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                    selectedFilter === filter.id
                                        ? 'bg-white/20 text-white'
                                        : themeMode === 'dark'
                                            ? 'bg-zinc-700 text-zinc-400'
                                            : 'bg-zinc-200 text-zinc-600'
                                }`}>
                                    {filter.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quest Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuests.map((userQuest) => {
                        const questDef = QUEST_POOL.find(q => q.id === userQuest.questId);
                        if (!questDef) return null;

                        const percent = Math.min(100, (userQuest.progress / questDef.target) * 100);
                        const isCompleted = userQuest.completed;
                        const isClaimed = userQuest.claimed;
                        const canClaim = isCompleted && !isClaimed;

                        return (
                            <Card
                                key={userQuest.questId}
                                className={`relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                                    themeMode === 'dark' 
                                        ? 'bg-[#0a0a0a] border-white/5' 
                                        : 'bg-white border-zinc-200'
                                } ${canClaim ? 'ring-2 ring-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.3)]' : ''} shadow-lg`}
                            >
                                {/* Gradient Background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryGradient(questDef.category)}`}></div>
                                
                                <div className="relative p-6">
                                    {/* Category Badge */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getCategoryGradient(questDef.category)}`}>
                                            {getCategoryIcon(questDef.category)}
                                            <span className={`text-xs font-bold uppercase tracking-wider ${getCategoryColor(questDef.category)}`}>
                                                {questDef.category}
                                            </span>
                                        </div>
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold ${
                                            themeMode === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                                        }`}>
                                            <Gem className="w-3 h-3" />
                                            +{questDef.xpReward}
                                        </div>
                                    </div>

                                    {/* Quest Title */}
                                    <div className="mb-4">
                                        <h3 className={`text-lg font-bold mb-2 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                                            {questDef.description}
                                        </h3>
                                        <div className={`text-sm ${themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                            {isCompleted ? 
                                                (isClaimed ? '✅ Completed' : '🎉 Ready to Claim') : 
                                                '🔄 In Progress'
                                            }
                                        </div>
                                    </div>

                                    {/* Progress Section */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className={`text-xs font-medium uppercase tracking-wider ${
                                                themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'
                                            }`}>
                                                Progress
                                            </span>
                                            <span className={`text-sm font-bold font-mono ${
                                                isCompleted ? getCategoryColor(questDef.category) : 
                                                themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
                                            }`}>
                                                {userQuest.progress} / {questDef.target}
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className={`h-2 w-full rounded-full overflow-hidden ${
                                            themeMode === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'
                                        }`}>
                                            <div
                                                className={`h-full transition-all duration-1000 ${
                                                    isCompleted ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 
                                                    `bg-gradient-to-r ${getCategoryColor(questDef.category).replace('text-', 'from-')} to-${getCategoryColor(questDef.category).replace('text-', 'to-')}`
                                                }`}
                                                style={{ width: `${percent}%` }}
                                            ></div>
                                        </div>

                                        {/* Action Button */}
                                        {isCompleted ? (
                                            isClaimed ? (
                                                <button
                                                    disabled
                                                    className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest cursor-not-allowed border ${
                                                        themeMode === 'dark' ? 'bg-zinc-800/50 text-zinc-600 border-white/10' : 'bg-zinc-100/50 text-zinc-500 border-zinc-200'
                                                    }`}
                                                >
                                                    <Check className="w-4 h-4 inline mr-2" />
                                                    Completed
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={async () => {
                                                        setLoadingQuestId(userQuest.questId);
                                                        await claimQuestReward(userQuest.questId);
                                                        setLoadingQuestId(null);
                                                    }}
                                                    disabled={loadingQuestId === userQuest.questId}
                                                    className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                                                        loadingQuestId === userQuest.questId 
                                                            ? 'opacity-60 cursor-not-allowed' 
                                                            : 'hover:scale-[1.02] active:scale-[0.98]'
                                                    } bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse`}
                                                >
                                                    {loadingQuestId === userQuest.questId ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline mr-2"></div>
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Crown className="w-4 h-4 inline mr-2" />
                                                            Claim Reward
                                                        </>
                                                    )}
                                                </button>
                                            )
                                        ) : (
                                            <button
                                                disabled
                                                className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest cursor-not-allowed border ${
                                                    themeMode === 'dark' ? 'bg-zinc-800/50 text-zinc-600 border-white/10' : 'bg-zinc-100/50 text-zinc-500 border-zinc-200'
                                                }`}
                                            >
                                                <Lock className="w-4 h-4 inline mr-2" />
                                                Locked
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Decorative Elements */}
                                {canClaim && (
                                    <div className="absolute top-2 right-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>

                {/* Admin Controls */}
                {isAdmin && (
                    <div className="mt-12 pt-8 border-t border-white/10">
                        <div className="text-center">
                            <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${
                                themeMode === 'dark' ? 'text-zinc-600' : 'text-zinc-500'
                            }`}>
                                [Admin Controls]
                            </p>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleReset}
                                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                            >
                                <Rocket className="w-4 h-4 mr-2" />
                                Force Reset Quests
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen min-w-full bg-black/80 backdrop-blur-sm p-4">
                    <div className="max-w-md w-full animate-in zoom-in duration-200">
                        <div className={`relative rounded-3xl overflow-hidden shadow-2xl border ${
                            themeMode === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'
                        }`}>
                            <div className="p-6 space-y-6">
                                <div className="text-center">
                                    <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                                        themeMode === 'dark' ? 'bg-red-500/20' : 'bg-red-100'
                                    }`}>
                                        <Rocket className={`w-8 h-8 ${themeMode === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                                    </div>
                                    <h3 className={`text-xl font-bold mb-2 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                                        Reset Quests
                                    </h3>
                                    <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                        This will replace your current quests with new ones. Are you sure?
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="ghost"
                                        className="flex-1"
                                        onClick={() => setShowResetModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                                        onClick={confirmReset}
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default QuestsView;
