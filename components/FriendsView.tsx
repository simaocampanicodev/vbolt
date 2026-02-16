
import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { UserPlus, Check, X, UserMinus, Search } from 'lucide-react';

const FriendsView = () => {
  const { currentUser, allUsers, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, themeMode, setViewProfileId } = useGame();
  const [searchTerm, setSearchTerm] = useState('');
  const [showRemoveModal, setShowRemoveModal] = useState<string | null>(null);

  const friends = allUsers.filter(u => currentUser.friends?.includes(u.id));
  const pendingRequests = currentUser.friendRequests || [];

  const searchResults = searchTerm.length > 2 
    ? allUsers.filter(u => 
        u.id !== currentUser.id && 
        !currentUser.friends?.includes(u.id) &&
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    ) 
    : [];

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center">
        <h2 className={`text-4xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>FRIENDS</h2>
        <p className="text-zinc-500 uppercase tracking-widest text-xs mt-2">Connect with other players</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Friends List */}
          <Card className="h-[500px] flex flex-col">
              <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>Your Friends ({friends.length})</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                  {friends.length === 0 ? (
                      <div className={`text-center italic mt-10 ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>You haven't added any friends yet.</div>
                  ) : (
                      friends.map(friend => (
                          <div key={friend.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${themeMode === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                              <div 
                                className="flex items-center space-x-3 cursor-pointer"
                                onClick={() => setViewProfileId(friend.id)}
                              >
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${themeMode === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-700'}`}>
                                      {friend.avatarUrl ? <img src={friend.avatarUrl} className="w-full h-full object-cover"/> : friend.username[0]}
                                  </div>
                                  <div>
                                      <span className={`block font-bold text-sm ${themeMode === 'dark' ? 'text-zinc-200' : 'text-zinc-900'}`}>{friend.username}</span>
                                      <span className={`text-[10px] ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>Lvl {friend.level || 1} • {Math.floor(friend.points)} MMR</span>
                                  </div>
                              </div>
                              <button 
                                onClick={() => setShowRemoveModal(friend.id)}
                                className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                                title="Remove Friend"
                              >
                                  <UserMinus className="w-4 h-4" />
                              </button>
                          </div>
                      ))
                  )}
              </div>
          </Card>

          {/* Right Column: Requests & Search */}
          <div className="space-y-6">
              
              {/* Requests */}
              <Card className="max-h-[240px] flex flex-col">
                  <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>Pending Requests ({pendingRequests.length})</h3>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                      {pendingRequests.length === 0 ? (
                          <div className={`text-center italic text-sm ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>No pending requests.</div>
                      ) : (
                          pendingRequests.map(req => {
                              const sender = allUsers.find(u => u.id === req.fromId);
                              if (!sender) return null;
                              return (
                                  <div key={req.fromId} className={`flex items-center justify-between p-3 rounded-xl border ${themeMode === 'dark' ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
                                      <div className="flex items-center space-x-2">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden ${themeMode === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-700'}`}>
                                              {sender.avatarUrl ? <img src={sender.avatarUrl} className="w-full h-full object-cover"/> : sender.username[0]}
                                          </div>
                                          <span className={`text-sm font-bold ${themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-900'}`}>{sender.username}</span>
                                      </div>
                                      <div className="flex space-x-2">
                                          <button 
                                            onClick={() => acceptFriendRequest(req.fromId)}
                                            className="p-1.5 bg-emerald-500/20 text-emerald-500 rounded hover:bg-emerald-500/30"
                                          >
                                              <Check className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => rejectFriendRequest(req.fromId)}
                                            className="p-1.5 bg-rose-500/20 text-rose-500 rounded hover:bg-rose-500/30"
                                          >
                                              <X className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </div>
                              )
                          })
                      )}
                  </div>
              </Card>

              {/* Search */}
              <Card className="h-[240px] flex flex-col">
                  <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>Add Friends</h3>
                  <div className="relative mb-4">
                      <input 
                        type="text" 
                        placeholder="Search username..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-rose-500 ${themeMode === 'dark' ? 'bg-black/20 border border-white/10 text-white' : 'bg-white border border-zinc-300 text-zinc-900'}`}
                      />
                      <Search className={`w-4 h-4 absolute left-3 top-2.5 ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`} />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                      {searchTerm.length > 0 && searchResults.length === 0 && (
                          <div className={`text-center text-xs ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>No users found.</div>
                      )}
                      {searchResults.map(user => (
                          <div key={user.id} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${themeMode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-zinc-100'}`}>
                              <div className="flex items-center space-x-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden ${themeMode === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-700'}`}>
                                      {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover"/> : user.username[0]}
                                  </div>
                                  <span className={`text-sm ${themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-900'}`}>{user.username}</span>
                              </div>
                              {currentUser.friendRequests?.some(r => r.toId === user.id) ? (
                                  <span className={`text-[10px] uppercase ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>Sent</span>
                              ) : (
                                  <button 
                                    onClick={() => sendFriendRequest(user.id)}
                                    className={`p-1.5 rounded transition-colors ${themeMode === 'dark' ? 'bg-zinc-700/50 text-zinc-300 hover:bg-rose-500 hover:text-white' : 'bg-zinc-200 text-zinc-700 hover:bg-rose-500 hover:text-white'}`}
                                  >
                                      <UserPlus className="w-3 h-3" />
                                  </button>
                              )}
                          </div>
                      ))}
                  </div>
              </Card>

          </div>
      </div>

      {/* Remove Friend Modal */}
      {showRemoveModal && (
        <Modal
          isOpen={!!showRemoveModal}
          onClose={() => setShowRemoveModal(null)}
          title="Remove Friend"
          message={`Are you sure you want to remove ${allUsers.find(u => u.id === showRemoveModal)?.username || 'this friend'}?`}
          confirmText="Remove"
          cancelText="Cancel"
          onConfirm={() => {
            if (showRemoveModal) {
              removeFriend(showRemoveModal);
              setShowRemoveModal(null);
            }
          }}
          variant="warning"
        />
      )}
    </div>
  );
};

export default FriendsView;
