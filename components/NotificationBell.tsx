import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Swords, Users, UserCheck, UserX, UserMinus, UserPlus, Trophy, Star, Heart, MessageCircle, Trash2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { AppNotification, NotificationType } from '../types';

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  QUEST_READY: <Trophy className="w-4 h-4 text-amber-400" />,
  FRIEND_REQUEST_RECEIVED: <Users className="w-4 h-4 text-blue-400" />,
  FRIEND_REQUEST_ACCEPTED: <UserCheck className="w-4 h-4 text-emerald-400" />,
  FRIEND_REQUEST_REJECTED: <UserX className="w-4 h-4 text-red-400" />,
  FRIEND_REMOVED: <UserMinus className="w-4 h-4 text-orange-400" />,
  FRIEND_ADDED: <UserPlus className="w-4 h-4 text-teal-400" />,
  MATCH_ENDED: <Swords className="w-4 h-4 text-rose-400" />,
  COMMEND_RECEIVED: <Star className="w-4 h-4 text-yellow-400" />,
  SUGGESTION_LIKED: <Heart className="w-4 h-4 text-pink-400" />,
  FRIEND_MESSAGE: <MessageCircle className="w-4 h-4 text-cyan-400" />,
};

const TYPE_BG: Record<NotificationType, string> = {
  QUEST_READY: 'bg-amber-500/10',
  FRIEND_REQUEST_RECEIVED: 'bg-blue-500/10',
  FRIEND_REQUEST_ACCEPTED: 'bg-emerald-500/10',
  FRIEND_REQUEST_REJECTED: 'bg-red-500/10',
  FRIEND_REMOVED: 'bg-orange-500/10',
  FRIEND_ADDED: 'bg-teal-500/10',
  MATCH_ENDED: 'bg-rose-500/10',
  COMMEND_RECEIVED: 'bg-yellow-500/10',
  SUGGESTION_LIKED: 'bg-pink-500/10',
  FRIEND_MESSAGE: 'bg-cyan-500/10',
};

/** Map a notification type to the view where its content lives */
function getTargetView(type: NotificationType): string | null {
  switch (type) {
    case 'FRIEND_REQUEST_RECEIVED':
    case 'FRIEND_REQUEST_ACCEPTED':
    case 'FRIEND_REQUEST_REJECTED':
    case 'FRIEND_REMOVED':
    case 'FRIEND_ADDED':
    case 'FRIEND_MESSAGE':
      return 'friends';
    case 'SUGGESTION_LIKED':
      return 'suggestions';
    case 'QUEST_READY':
      return 'quests';
    case 'MATCH_ENDED':
      return 'history';
    case 'COMMEND_RECEIVED':
      return 'profile';
    default:
      return null;
  }
}

/** Notification types that should be auto-cleared when viewing a specific tab */
const VIEW_CLEAR_MAP: Record<string, NotificationType[]> = {
  friends: [
    'FRIEND_REQUEST_RECEIVED',
    'FRIEND_REQUEST_ACCEPTED',
    'FRIEND_REQUEST_REJECTED',
    'FRIEND_REMOVED',
    'FRIEND_ADDED',
  ],
  suggestions: ['SUGGESTION_LIKED'],
  quests: ['QUEST_READY'],
  history: ['MATCH_ENDED'],
  profile: ['COMMEND_RECEIVED'],
};

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

interface NotificationBellProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ currentView, setCurrentView }) => {
  const { notifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications, clearNotificationsByType, themeMode } = useGame();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read).length;
  const dark = themeMode === 'dark';

  // ── Auto-clear notifications when the user is on the relevant view ──
  useEffect(() => {
    const typesToClear = VIEW_CLEAR_MAP[currentView];
    if (!typesToClear || typesToClear.length === 0) return;

    // Find notifications that match the current view and are unread
    const matching = notifications.filter(
      n => !n.read && typesToClear.includes(n.type)
    );
    if (matching.length === 0) return;

    // Clear each matching type
    typesToClear.forEach(type => {
      clearNotificationsByType(type);
    });
  }, [currentView, notifications, clearNotificationsByType]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /** Click a notification: navigate to the relevant view, mark read, close panel */
  const handleNotificationClick = (n: AppNotification) => {
    markNotificationRead(n.id);
    const targetView = getTargetView(n.type);
    if (targetView) {
      setCurrentView(targetView);
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-all border ${open
          ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
          : dark
            ? 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
            : 'bg-black/5 border-black/10 text-zinc-500 hover:bg-black/10 hover:text-black'
          }`}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={`absolute right-0 top-12 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${dark
            ? 'bg-[#0e0e0e] border-white/10'
            : 'bg-white border-black/10'
            }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${dark ? 'border-white/8' : 'border-black/8'}`}>
            <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-black'}`}>Notifications</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-zinc-400 hover:text-rose-400 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  All read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-zinc-400 hover:text-red-400 transition-colors"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                <p className="text-xs text-zinc-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b last:border-0 ${dark ? 'border-white/5' : 'border-black/5'
                    } ${!n.read
                      ? dark ? 'bg-white/[0.04]' : 'bg-black/[0.03]'
                      : ''
                    } hover:${dark ? 'bg-white/[0.07]' : 'bg-black/[0.05]'}`}
                >
                  {/* Icon bubble */}
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${TYPE_BG[n.type]}`}>
                    {TYPE_ICON[n.type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-relaxed ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{formatRelative(n.timestamp)}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
