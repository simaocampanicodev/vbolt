import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import Card from './ui/Card';
import Button from './ui/Button';
import {
  Users,
  ListOrdered,
  CircleDot,
  MessageSquare,
  Shield,
  Search,
  ChevronDown,
  BadgeCheck,
  Code,
  HelpCircle,
  User as UserIcon
} from 'lucide-react';
import { UserRole } from '../types';
import { getRankInfo } from '../services/gameService';

type TabId = 'users' | 'queue' | 'online' | 'tickets' | 'roles';

const AdminDashboard = () => {
  const {
    themeMode,
    hasDashboardAccess,
    currentUser,
    allUsers,
    queue,
    onlineUserIds,
    tickets,
    setUserRole,
    replyToTicket,
    setViewProfileId,
    reports,
    showToast
  } = useGame();
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<TabId>('users');
  const [userSearch, setUserSearch] = useState('');
  const [roleUserId, setRoleUserId] = useState('');
  const [roleAndVerified, setRoleAndVerified] = useState<string>('user');

  const isHelperOnly = currentUser.role === 'helper';

  if (!hasDashboardAccess) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-zinc-500">You do not have access to the dashboard.</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'queue', label: 'Queue', icon: ListOrdered },
    { id: 'online', label: 'Online', icon: CircleDot },
    { id: 'tickets', label: 'Tickets', icon: MessageSquare },
    { id: 'roles', label: 'Role Management', icon: Shield }
  ];

  const realUsers = allUsers.filter(u => !u.isBot);
  const filteredUsers = userSearch.trim()
    ? realUsers.filter(u =>
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.id.toLowerCase().includes(userSearch.toLowerCase())
      )
    : realUsers;

  const onlineUsers = realUsers.filter(u => onlineUserIds.has(u.id));
  const suggestionTickets = tickets.filter(t => t.type === 'suggestion');
  const supportTickets = tickets.filter(t => t.type === 'support' || !t.type);

  const handleSetRole = async () => {
    const query = roleUserId.trim();
    if (!query) return;
    const target = realUsers.find(u => u.id === query || u.username.toLowerCase() === query.toLowerCase());
    if (!target) {
      showToast('User not found. Use exact username or user ID.', 'error');
      return;
    }
    const verified = roleAndVerified.endsWith('_verified');
    const role = (roleAndVerified.replace('_verified', '') || 'user') as UserRole;
    await setUserRole(target.id, role, verified);
    setRoleUserId('');
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center">
        <h2 className={`text-4xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
          {isHelperOnly ? 'TICKETS' : 'DASHBOARD'}
        </h2>
        <p className="text-zinc-500 uppercase tracking-widest text-xs mt-2">
          {isHelperOnly ? 'Support & Suggestions' : 'Admin & Mod Panel'}
        </p>
      </div>

      {!isHelperOnly && (
        <div className={`flex flex-wrap gap-2 p-1 rounded-2xl mb-6 ${themeMode === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-rose-500 text-white shadow-lg'
                  : themeMode === 'dark'
                    ? 'text-zinc-400 hover:text-white hover:bg-white/10'
                    : 'text-zinc-600 hover:text-black hover:bg-black/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Users */}
      {!isHelperOnly && activeTab === 'users' && (
        <Card>
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <h3 className={`text-lg font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
              Total users: {realUsers.length}
            </h3>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <input
                type="text"
                placeholder="Search username or ID..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className={`w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl text-sm outline-none border ${
                  themeMode === 'dark' ? 'bg-black/20 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                }`}
              />
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto space-y-2 dashboard-scroll pr-1">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">No users match.</p>
            ) : (
              filteredUsers.map(user => {
                const rank = getRankInfo(user.points);
                return (
                  <div
                    key={user.id}
                    onClick={() => setViewProfileId(user.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                      themeMode === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-sm font-bold">{user.username[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-medium truncate ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                          {user.username}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{user.id}</p>
                      </div>
                      {user.verified && <BadgeCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      {user.role && user.role !== 'user' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-600/50 text-zinc-300 flex-shrink-0">
                          {user.role}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-zinc-500" style={{ color: rank.color }}>{rank.name}</span>
                      <span className="text-xs text-zinc-500">{Math.floor(user.points)} MMR</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* Queue */}
      {!isHelperOnly && activeTab === 'queue' && (
        <Card>
          <h3 className={`text-lg font-display font-bold mb-4 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
            Players in queue ({queue.length}/10)
          </h3>
          <div className="space-y-2">
            {queue.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">Queue is empty.</p>
            ) : (
              queue.map((user, i) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    themeMode === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'
                  }`}
                >
                  <span className="text-zinc-500 font-mono text-sm">#{i + 1}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center">
                      {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.username[0]}
                    </div>
                    <span className={`font-medium ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>{user.username}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setViewProfileId(user.id)}>View profile</Button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Online */}
      {!isHelperOnly && activeTab === 'online' && (
        <Card>
          <h3 className={`text-lg font-display font-bold mb-4 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
            Online now ({onlineUsers.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onlineUsers.length === 0 ? (
              <p className="text-zinc-500 col-span-2 text-center py-8">No one online.</p>
            ) : (
              onlineUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => setViewProfileId(user.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    themeMode === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center">
                    {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.username[0]}
                  </div>
                  <span className={`font-medium truncate ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>{user.username}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Tickets (support + suggestions) – visível para todos com acesso (inclui helpers) */}
      {(isHelperOnly || activeTab === 'tickets') && (
        <div className="space-y-6">
          <Card>
            <h3 className={`text-lg font-display font-bold mb-4 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
              Support & Suggestions ({tickets.length})
            </h3>
            <div className="max-h-[480px] overflow-y-auto space-y-4 dashboard-scroll pr-1">
              {tickets.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">No tickets yet.</p>
              ) : (
                tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className={`p-4 rounded-xl border ${
                      themeMode === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <span className={`font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                        {ticket.username}
                      </span>
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${
                        ticket.type === 'suggestion' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {ticket.type === 'suggestion' ? 'Suggestion' : 'Support'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">{new Date(ticket.timestamp).toLocaleString()}</p>
                    {ticket.subject && (
                      <p className={`text-sm font-medium mb-1 ${themeMode === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>
                        {ticket.subject}
                      </p>
                    )}
                    {ticket.message && (
                      <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        {ticket.message}
                      </p>
                    )}
                    {ticket.parts && Object.keys(ticket.parts).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {Object.entries(ticket.parts).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-[10px] uppercase text-zinc-500">{key}</span>
                            <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Reply UI / display */}
                    <div className="mt-3">
                      {ticket.reply ? (
                        <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/5">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center">
                              {ticket.reply.replierAvatarUrl ? <img src={ticket.reply.replierAvatarUrl} className="w-full h-full object-cover" /> : ticket.reply.replierUsername[0]}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{ticket.reply.replierUsername}</div>
                              <div className="text-[10px] text-zinc-500">{new Date(ticket.reply.repliedAt).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className={`text-sm ${themeMode === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>{ticket.reply.text}</div>
                        </div>
                      ) : (
                        // If suggestion and staff can reply, show draft box
                        ticket.type === 'suggestion' && (currentUser.role === 'mod' || currentUser.role === 'owner' || currentUser.role === 'dev' || currentUser.role === 'helper') && (
                          <div className="mt-2">
                            <textarea
                              placeholder="Write a reply..."
                              value={replyDrafts[ticket.id] || ''}
                              onChange={(e) => setReplyDrafts(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                              className="w-full rounded-xl p-3 bg-transparent border border-white/5 text-sm text-white outline-none"
                            />
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" variant="ghost" onClick={() => setReplyDrafts(prev => ({ ...prev, [ticket.id]: '' }))}>Cancel</Button>
                              <Button size="sm" onClick={async () => {
                                const txt = (replyDrafts[ticket.id] || '').trim();
                                if (!txt) return showToast('Reply cannot be empty', 'error');
                                await replyToTicket(ticket.id, txt);
                                setReplyDrafts(prev => ({ ...prev, [ticket.id]: '' }));
                              }}>Reply</Button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
          {/* Reports: always visible for admin and helpers in Tickets zone */}
          <Card>
            <h3 className={`text-lg font-display font-bold mb-4 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
              Reports ({reports.length})
            </h3>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {reports.length === 0 ? (
                <p className="text-center text-zinc-500 py-6">No reports yet.</p>
              ) : (
                reports.map(r => (
                  <div key={r.id} className={`p-3 rounded-xl border ${themeMode === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                    <p className="text-xs text-zinc-500">{new Date(r.timestamp).toLocaleString()}</p>
                    <p className="font-medium">{r.reporter} → {r.reportedUser}</p>
                    <p className="text-sm text-zinc-400">{r.reason}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Role Management */}
      {!isHelperOnly && activeTab === 'roles' && (
        <Card>
          <h3 className={`text-lg font-display font-bold mb-4 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
            Set user role
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Owner, Mod and Dev get dashboard access. Verified badge can be combined with any role. Use username or user ID.
          </p>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-zinc-500 uppercase mb-1">User (username or ID)</label>
              <input
                type="text"
                value={roleUserId}
                onChange={e => setRoleUserId(e.target.value)}
                placeholder="e.g. txger. or user ID"
                className={`w-full rounded-xl p-3 border outline-none ${
                  themeMode === 'dark' ? 'bg-black/20 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                }`}
              />
            </div>
            <div className="min-w-[220px]">
              <label className="block text-xs text-zinc-500 uppercase mb-1">Role</label>
              <select
                value={roleAndVerified}
                onChange={e => setRoleAndVerified(e.target.value)}
                className={`w-full rounded-xl px-4 py-3.5 border outline-none text-base font-medium ${
                  themeMode === 'dark' ? 'bg-zinc-800 border-white/10 text-white' : 'bg-zinc-800 border-white/10 text-white'
                }`}
              >
                <option value="user">User</option>
                <option value="user_verified">User (Verified)</option>
                <option value="owner">Owner</option>
                <option value="owner_verified">Owner (Verified)</option>
                <option value="helper">Helper</option>
                <option value="helper_verified">Helper (Verified)</option>
                <option value="mod">Mod</option>
                <option value="mod_verified">Mod (Verified)</option>
                <option value="dev">Dev</option>
                <option value="dev_verified">Dev (Verified)</option>
              </select>
            </div>
            <Button onClick={handleSetRole}>Apply</Button>
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            To find a user ID: open Users tab, click the user, or check the profile URL / console.
          </p>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
