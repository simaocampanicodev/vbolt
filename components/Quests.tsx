
import React from 'react';
import { useGame } from '../context/GameContext';
import { QUEST_POOL } from '../constants';
import Card from './ui/Card';
import Button from './ui/Button';
import { Check, Lock, Zap, Clock, Star, Trophy, Target, Calendar } from 'lucide-react';
import { Quest, UserQuest } from '../types';

const Quests = () => {
  const { currentUser, claimQuestReward, themeMode } = useGame();

  if (!currentUser.activeQuests || currentUser.activeQuests.length === 0) {
      return <div className="text-zinc-500 text-center italic p-8">No active missions available.</div>;
  }

  // Sort: Daily -> Monthly -> Unique
  const sortedQuests = [...currentUser.activeQuests].sort((a, b) => {
      const qA = QUEST_POOL.find(q => q.id === a.questId);
      const qB = QUEST_POOL.find(q => q.id === b.questId);
      if (!qA || !qB) return 0;
      
      const order = { 'DAILY': 1, 'MONTHLY': 2, 'UNIQUE': 3 };
      return order[qA.category] - order[qB.category];
  });

  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case 'DAILY': return <Zap className="w-3 h-3 mr-1" />;
          case 'MONTHLY': return <Calendar className="w-3 h-3 mr-1" />;
          case 'UNIQUE': return <Target className="w-3 h-3 mr-1" />;
          default: return <Star className="w-3 h-3 mr-1" />;
      }
  };

  const getCategoryColor = (cat: string) => {
      switch(cat) {
          case 'DAILY': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
          case 'MONTHLY': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
          case 'UNIQUE': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
          default: return 'text-zinc-400';
      }
  };

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedQuests.map((userQuest) => {
            const questDef = QUEST_POOL.find(q => q.id === userQuest.questId);
            if (!questDef) return null;

            const percent = Math.min(100, (userQuest.progress / questDef.target) * 100);
            
            return (
                <div 
                    key={userQuest.questId} 
                    className={`
                        relative overflow-hidden rounded-2xl border p-5 flex flex-col justify-between transition-all hover:scale-[1.01]
                        ${themeMode === 'dark' 
                            ? 'bg-[#0f0f0f] border-zinc-800 hover:border-zinc-700' 
                            : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'}
                        ${userQuest.completed && !userQuest.claimed ? 'shadow-[0_0_20px_rgba(16,185,129,0.1)] border-emerald-500/30' : ''}
                    `}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`flex items-center text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${getCategoryColor(questDef.category)}`}>
                            {getCategoryIcon(questDef.category)}
                            {questDef.category}
                        </div>
                        <div className="flex items-center text-emerald-400 font-bold font-mono text-sm bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                             +{questDef.xpReward} XP
                        </div>
                    </div>

                    <div className="mb-4">
                        <h4 className={`font-display font-bold text-lg leading-tight mb-1 ${themeMode === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>
                            {questDef.description}
                        </h4>
                        <p className={`text-xs ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                             {userQuest.completed ? "Objective Complete" : "In Progress"}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className={`flex justify-between text-xs font-mono ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                            <span>PROGRESS</span>
                            <span className={userQuest.completed ? 'text-emerald-500' : ''}>{userQuest.progress} / {questDef.target}</span>
                        </div>
                        <div className={`h-2 w-full rounded-full overflow-hidden ${themeMode === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                            <div 
                                className={`h-full transition-all duration-1000 ${userQuest.completed ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>

                        {userQuest.completed ? (
                             userQuest.claimed ? (
                                <button disabled className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest cursor-default border border-transparent ${themeMode === 'dark' ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-200 text-zinc-500'}`}>
                                    COMPLETED
                                </button>
                             ) : (
                                <button 
                                    onClick={() => claimQuestReward(userQuest.questId)}
                                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse transition-all"
                                >
                                    CLAIM REWARD
                                </button>
                             )
                        ) : (
                            <button disabled className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest cursor-not-allowed border ${themeMode === 'dark' ? 'bg-zinc-800/50 text-zinc-600 border-white/5' : 'bg-zinc-200/50 text-zinc-500 border-zinc-300'}`}>
                                LOCKED
                            </button>
                        )}
                    </div>
                </div>
            );
        })}
    </div>
  );
};

export default Quests;
