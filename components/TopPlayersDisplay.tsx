import React from 'react';
import { useGame } from '../context/GameContext';
import { getRankInfo } from '../services/gameService';

interface TopPlayerCardProps {
  user: any;
  position: number;
  themeMode: 'dark' | 'light';
}

const TopPlayerCard: React.FC<TopPlayerCardProps> = ({ user, position, themeMode }) => {
  const rankInfo = getRankInfo(user.points, position);
  
  const getCardColors = () => {
    switch (position) {
      case 1:
        return {
          bg: 'bg-gradient-to-br from-yellow-600 to-yellow-700',
          border: 'border-yellow-500',
          text: 'text-yellow-100',
          shadow: 'shadow-yellow-500/50'
        };
      case 2:
        return {
          bg: 'bg-gradient-to-br from-gray-600 to-gray-700',
          border: 'border-gray-500',
          text: 'text-gray-100',
          shadow: 'shadow-gray-500/50'
        };
      case 3:
        return {
          bg: 'bg-gradient-to-br from-orange-700 to-orange-800',
          border: 'border-orange-600',
          text: 'text-orange-100',
          shadow: 'shadow-orange-500/50'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-zinc-600 to-zinc-700',
          border: 'border-zinc-500',
          text: 'text-zinc-100',
          shadow: 'shadow-zinc-500/50'
        };
    }
  };

  const colors = getCardColors();
  
  const getCardSize = () => {
    switch (position) {
      case 1:
        return 'w-72 h-80'; // Mais largo e alto
      case 2:
        return 'w-64 h-72'; // Médio
      case 3:
        return 'w-56 h-64'; // Menor
      default:
        return 'w-56 h-64';
    }
  };

  return (
    <div className={`relative ${getCardSize()} ${colors.bg} ${colors.border} border-2 rounded-xl p-5 shadow-lg ${colors.shadow} transition-all hover:scale-105 hover:shadow-xl`}>
      {/* Position Badge */}
      <div className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
        <span className={`font-bold text-sm ${position === 1 ? 'text-yellow-600' : position === 2 ? 'text-gray-600' : 'text-orange-600'}`}>
          #{position}
        </span>
      </div>

      {/* Player Avatar */}
      <div className="flex justify-center mb-4">
        <div className={`${
          position === 1 ? 'w-20 h-20' : position === 2 ? 'w-16 h-16' : 'w-14 h-14'
        } rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30`}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <span className={`${
              position === 1 ? 'text-3xl' : position === 2 ? 'text-2xl' : 'text-xl'
            } font-bold text-white`}>
              {user.username[0].toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Player Name */}
      <div className="text-center mb-4">
        <h3 className={`font-display font-bold ${
          position === 1 ? 'text-xl' : position === 2 ? 'text-lg' : 'text-base'
        } ${colors.text} truncate`}>
          {user.username}
        </h3>
      </div>

      {/* Tier Badge */}
      <div className="flex justify-center mb-4">
        <span
          className="text-xs px-3 py-1 rounded-full border border-white/30 bg-white/20"
          style={{ color: rankInfo.color }}
        >
          {rankInfo.name}
        </span>
      </div>

      {/* Stats Grid */}
      <div className={`space-y-3 text-center ${
        position === 1 ? 'text-base' : position === 2 ? 'text-sm' : 'text-xs'
      }`}>
        <div className="flex justify-between items-center">
          <span className="text-xs text-white/70">Level</span>
          <span className={`font-bold ${colors.text}`}>{user.level || 1}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-white/70">Rating</span>
          <span className={`font-mono font-bold ${colors.text}`}>{Math.floor(user.points)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-white/70">W/L</span>
          <span className={`font-bold ${colors.text}`}>{user.wins} / {user.losses}</span>
        </div>
      </div>
    </div>
  );
};

interface TopPlayersDisplayProps {
  sortBy: 'mmr' | 'level';
}

const TopPlayersDisplay: React.FC<TopPlayersDisplayProps> = ({ sortBy }) => {
  const { allUsers, themeMode } = useGame();

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

  // Get top 3 players
  const top3Players = sortedUsers.slice(0, 3);

  if (top3Players.length === 0) {
    return (
      <div className="flex justify-center items-end gap-6 mb-8">
        {[2, 1, 3].map((position) => (
          <div
            key={position}
            className={`${
              position === 1 ? 'w-72 h-80' : position === 2 ? 'w-64 h-72' : 'w-56 h-64'
            } rounded-xl border-2 border-dashed flex flex-col items-center justify-center ${
              themeMode === 'dark' ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'
            }`}
          >
            <span className={themeMode === 'dark' ? 'text-white/50' : 'text-black/50'}>
              Aguardando dados
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Reorder players: #2, #1, #3 for proper layout
  const orderedPlayers = [
    top3Players[1], // #2 (left)
    top3Players[0], // #1 (center)
    top3Players[2]  // #3 (right)
  ].filter(Boolean);

  return (
    <div className="flex justify-center items-end gap-6 mb-8">
      {orderedPlayers.map((user, index) => {
        const position = index === 0 ? 2 : index === 1 ? 1 : 3;
        return (
          <TopPlayerCard
            key={user.id}
            user={user}
            position={position}
            themeMode={themeMode}
          />
        );
      })}
    </div>
  );
};

export default TopPlayersDisplay;
