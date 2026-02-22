import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { MessageCircle, X, Send } from 'lucide-react';
import { db } from '../lib/firestore';
import { collection, addDoc, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';

function getChatId(a: string, b: string) {
  return [a, b].sort().join('_');
}

interface ChatMsg {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
}

const ChatBubbleOverlay: React.FC = () => {
  const { isAuthenticated, currentUser, allUsers, notifications, themeMode, clearNotificationsByType, onlineUserIds, createNotification } = useGame();
  const [open, setOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [lastMessages, setLastMessages] = useState<Record<string, { text: string; timestamp: number }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dark = themeMode === 'dark';
  const [friendTyping, setFriendTyping] = useState(false);
  const lastTypingSentRef = useRef<number>(0);

  const friends = useMemo(() => {
    const ids = currentUser.friends || [];
    return ids
      .map(id => allUsers.find(u => u.id === id))
      .filter(Boolean) as typeof allUsers;
  }, [currentUser.friends, allUsers]);

  const unreadTotal = useMemo(() => {
    return notifications.filter(n => !n.read && n.type === 'FRIEND_MESSAGE').length;
  }, [notifications]);

  const unreadByFriend = (id: string) => {
    return notifications.filter(n => !n.read && n.type === 'FRIEND_MESSAGE' && (n.data as any)?.fromUserId === id).length;
  };

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const entries: Record<string, { text: string; timestamp: number }> = {};
      await Promise.all(friends.map(async f => {
        const chatId = getChatId(currentUser.id, f!.id);
        const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'desc'), limit(1));
        const snap = await getDocs(q);
        const d = snap.docs[0];
        if (d) {
          const data = d.data() as any;
          entries[f!.id] = { text: String(data.text || ''), timestamp: Number(data.timestamp || 0) };
        }
      }));
      setLastMessages(entries);
    };
    load();
  }, [open, friends, currentUser.id]);

  useEffect(() => {
    if (selectedChat) {
      clearNotificationsByType('FRIEND_MESSAGE', selectedChat);
    }
  }, [selectedChat, clearNotificationsByType]);

  useEffect(() => {
    if (!selectedChat || !currentUser.id || currentUser.id === 'user-1') {
      setMessages([]);
      return;
    }
    const chatId = getChatId(currentUser.id, selectedChat);
    const colRef = collection(db, 'chats', chatId, 'messages');
    const q = query(colRef, orderBy('timestamp', 'asc'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      const list: ChatMsg[] = snap.docs.map(d => ({
        id: d.id,
        text: String(d.data().text || ''),
        sender: String(d.data().sender || ''),
        timestamp: Number(d.data().timestamp || 0),
      }));
      setMessages(list);
    });
    return () => unsub();
  }, [selectedChat, currentUser.id]);

  useEffect(() => {
    if (!selectedChat || !currentUser.id || currentUser.id === 'user-1') {
      setFriendTyping(false);
      return;
    }
    const chatId = getChatId(currentUser.id, selectedChat);
    const colRef = collection(db, 'chats', chatId, 'typing');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      const d = snap.docs[0];
      if (!d) {
        setFriendTyping(false);
        return;
      }
      const data = d.data() as any;
      const isFriend = String(data.sender) === selectedChat;
      const fresh = Date.now() - Number(data.timestamp || 0) < 4000;
      setFriendTyping(isFriend && fresh);
    });
    return () => unsub();
  }, [selectedChat, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<any>)?.detail || {};
      setOpen(true);
      const userId = detail.userId || detail.fromUserId;
      if (userId) setSelectedChat(userId);
    };
    window.addEventListener('open-chat-bubble', handler as EventListener);
    return () => window.removeEventListener('open-chat-bubble', handler as EventListener);
  }, []);

  const sendTypingSignal = async () => {
    if (!selectedChat || !currentUser.id || currentUser.id === 'user-1') return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    const chatId = getChatId(currentUser.id, selectedChat);
    await addDoc(collection(db, 'chats', chatId, 'typing'), {
      sender: currentUser.id,
      timestamp: now,
    });
  };

  const sendMessage = async () => {
    if (!chatMessage.trim() || !selectedChat || !currentUser.id || currentUser.id === 'user-1') return;
    const text = chatMessage.trim();
    setChatMessage('');
    const chatId = getChatId(currentUser.id, selectedChat);
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text,
      sender: currentUser.id,
      timestamp: Date.now(),
    });
    createNotification(
      selectedChat,
      'FRIEND_MESSAGE',
      `${currentUser.username} sent you a message: "${text.length > 40 ? text.slice(0, 40) + '…' : text}"`,
      { fromUserId: currentUser.id }
    );
  };

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      <button
        onClick={() => setOpen(v => !v)}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center border shadow-lg ${
          dark ? 'bg-white/10 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
        }`}
      >
        <MessageCircle className="w-6 h-6" />
        {unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute bottom-16 right-0 w-[460px] rounded-2xl border shadow-2xl overflow-hidden relative ${
            dark ? 'bg-[#0a0a0a] border-zinc-900' : 'bg-white border-black/10'
          }`}
        >
          <div className={`absolute inset-0 pointer-events-none z-0 ${dark ? 'bg-gradient-to-br from-black/[0.6] to-rose-500/[0.08]' : 'bg-gradient-to-br from-black/[0.02] to-rose-500/[0.06]'}`}></div>
          <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(rgba(120,120,120,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(120,120,120,0.06) 1px, transparent 1px)', backgroundSize: '18px 18px' }}></div>
          <div className={`relative z-10 flex items-center justify-between px-5 py-4 border-b ${dark ? 'border-zinc-800' : 'border-black/8'}`}>
            <span className={`text-base font-bold ${dark ? 'text-white' : 'text-black'}`}>Messages</span>
            <div className="flex items-center gap-2">
              {selectedChat && (
                <button onClick={() => setSelectedChat(null)} className="px-2 py-1 rounded-lg text-[11px] font-medium text-white hover:text-rose-400 transition-colors">
                  Back
                </button>
              )}
              <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white hover:text-rose-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!selectedChat ? (
            <div className="relative z-10 max-h-[520px] overflow-y-auto overflow-x-hidden">
              {friends.length === 0 ? (
                <div className="py-16 text-center text-sm text-zinc-500">No friends yet</div>
              ) : (
                friends.map(friend => {
                  const unread = unreadByFriend(friend.id);
                  const last = lastMessages[friend.id]?.text || '';
                  return (
                    <button
                      key={friend.id}
                      onClick={() => setSelectedChat(friend.id)}
                      className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors border-b last:border-0 ${dark ? 'border-zinc-800' : 'border-black/10'} ${dark ? 'hover:bg-rose-500/10' : 'hover:bg-rose-500/10'}`}
                    >
                      <div className={`w-9 h-9 rounded-full overflow-hidden bg-zinc-200 text-black ring-2 ring-rose-500/30`}>
                        {friend.avatarUrl ? <img src={friend.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[11px]">{friend.username[0].toUpperCase()}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-black'}`}>{friend.username}</span>
                          {onlineUserIds?.has(friend.id) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate">{last}</p>
                      </div>
                      {unread > 0 && (
                        <span className="min-w-[18px] h-5 px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow-[0_0_12px_rgba(244,63,94,0.6)]">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div className="relative z-10 flex flex-col">
              <div className={`px-5 py-3 border-b ${dark ? 'border-zinc-800' : 'border-black/8'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full overflow-hidden bg-white text-black border border-white/20`}>
                    {(() => {
                      const f = allUsers.find(u => u.id === selectedChat);
                      return f?.avatarUrl ? <img src={f.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px]">{f?.username?.[0]?.toUpperCase() || '?'}</div>;
                    })()}
                  </div>
                  <span className="text-sm font-bold text-white">{allUsers.find(u => u.id === selectedChat)?.username}</span>
                </div>
              </div>
              <div className="max-h-[420px] overflow-y-auto p-4 space-y-3">
                {messages.map(m => {
                  const isMe = m.sender === currentUser.id;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`inline-block px-3 py-2 rounded-2xl text-sm max-w-[75%] ${isMe ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white border border-rose-400/30 shadow-lg' : dark ? 'bg-white/[0.06] text-white border border-white/10 backdrop-blur-sm' : 'bg-black/5 text-black border border-black/10 backdrop-blur-sm'}`}>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              {friendTyping && (
                <div className="px-4 pb-2 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] text-rose-400 font-medium">Typing</span>
                </div>
              )}
              <div className={`p-3 border-t ${dark ? 'border-zinc-800' : 'border-black/8'} flex items-center gap-2`}>
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => { setChatMessage(e.target.value); sendTypingSignal(); }}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className={`flex-1 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 ${dark ? 'bg-black/60 border border-zinc-800 text-white' : 'bg-black/5 border border-black/10 text-black'}`}
                />
                <button onClick={sendMessage} className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)] hover:from-rose-500 hover:to-rose-400">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatBubbleOverlay;
