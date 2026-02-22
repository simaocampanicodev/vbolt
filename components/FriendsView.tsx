
import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { UserPlus, Check, X, UserMinus, Search, Users, Sparkles, Eye } from 'lucide-react';


const FriendsView = () => {
    const {
        currentUser, allUsers, sendFriendRequest, acceptFriendRequest,
        rejectFriendRequest, removeFriend, themeMode, setViewProfileId,
        onlineUserIds,
    } = useGame();
    const [searchTerm, setSearchTerm] = useState('');
    const [showRemoveModal, setShowRemoveModal] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);


    // Simulate loading
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);




    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                        Loading Friends...
                    </h3>
                    <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                        Please wait while we fetch your friends list
                    </p>
                </div>
            </div>
        );
    }

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
        <>
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className={`text-4xl lg:text-5xl font-display font-bold tracking-tight ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                            Friends
                        </h1>
                        <p className="text-zinc-500 mt-2 font-medium">
                            Connect and chat with other players
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${themeMode === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                            }`}>
                            <Users className="w-4 h-4 inline mr-1" />
                            {friends.length} Friends
                        </div>
                        {onlineUserIds && (
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${themeMode === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                <div className="w-2 h-2 rounded-full bg-emerald-400 inline mr-1 animate-pulse"></div>
                                {Array.from(onlineUserIds).filter(id => currentUser.friends?.includes(id)).length} Online
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Friends List */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className={`relative overflow-hidden ${themeMode === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-zinc-200'} shadow-lg`}>
                            {/* Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-purple-500/5"></div>

                            <div className="relative p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-rose-400" />
                                        </div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Your Friends</h3>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${themeMode === 'dark' ? 'bg-white/10 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
                                        }`}>
                                        {friends.length}
                                    </span>
                                </div>

                                <div className="space-y-3 overflow-x-hidden">
                                    {friends.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${themeMode === 'dark' ? 'bg-zinc-800/50' : 'bg-zinc-100'
                                                }`}>
                                                <UserPlus className={`w-8 h-8 ${themeMode === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`} />
                                            </div>
                                            <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>No friends yet</p>
                                            <p className={`text-xs ${themeMode === 'dark' ? 'text-zinc-600' : 'text-zinc-500'} mt-1`}>Search and add players to get started</p>
                                        </div>
                                    ) : (
                                        friends.map(friend => (
                                            <div
                                                key={friend.id}
                                                className={`group relative p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] cursor-pointer ${themeMode === 'dark'
                                                    ? 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800/50 hover:border-white/10'
                                                    : 'bg-zinc-50 border-zinc-200 hover:bg-white hover:border-zinc-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${themeMode === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-700'
                                                                }`}>
                                                                {friend.avatarUrl ?
                                                                    <img src={friend.avatarUrl} className="w-full h-full object-cover" /> :
                                                                    friend.username[0].toUpperCase()
                                                                }
                                                            </div>
                                                            {onlineUserIds?.has(friend.id) && (
                                                                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-900 dark:border-black"></div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className={`font-bold text-sm ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                                                                {friend.username}
                                                            </div>
                                                            <div className={`text-xs ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                                                                Level {friend.level || 1} • {Math.floor(friend.points)} MMR
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setViewProfileId(friend.id);
                                                            }}
                                                            className={`p-2 rounded-lg transition-colors ${themeMode === 'dark'
                                                                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300'
                                                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700'
                                                                }`}
                                                            title="View profile"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowRemoveModal(friend.id);
                                                            }}
                                                            className={`p-2 rounded-lg transition-colors ${themeMode === 'dark'
                                                                ? 'bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400'
                                                                : 'bg-zinc-100 text-zinc-600 hover:bg-red-100 hover:text-red-600'
                                                                }`}
                                                            title="Remove friend"
                                                        >
                                                            <UserMinus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </Card>

                        
                    </div>

                    {/* Right Column: Requests & Search */}
                    <div className="space-y-6">

                        {/* Pending Requests */}
                        <Card className={`relative overflow-hidden ${themeMode === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-zinc-200'} shadow-lg`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5"></div>

                            <div className="relative p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                                            <Sparkles className="w-4 h-4 text-yellow-400" />
                                        </div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Pending Requests</h3>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${themeMode === 'dark' ? 'bg-white/10 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
                                        }`}>
                                        {pendingRequests.length}
                                    </span>
                                </div>

                                <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                                    {pendingRequests.length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>No pending requests</p>
                                        </div>
                                    ) : (
                                        pendingRequests.map(req => {
                                            const sender = allUsers.find(u => u.id === req.fromId);
                                            if (!sender) return null;
                                            return (
                                                <div key={req.fromId} className={`p-3 rounded-xl border ${themeMode === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-zinc-200'
                                                    }`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden ${themeMode === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-700'
                                                                }`}>
                                                                {sender.avatarUrl ?
                                                                    <img src={sender.avatarUrl} className="w-full h-full object-cover" /> :
                                                                    sender.username[0].toUpperCase()
                                                                }
                                                            </div>
                                                            <div>
                                                                <div className={`font-bold text-sm ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                                                                    {sender.username}
                                                                </div>
                                                                <div className={`text-xs ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                                                                    Level {sender.level || 1}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => acceptFriendRequest(req.fromId)}
                                                                className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                                                title="Accept"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => rejectFriendRequest(req.fromId)}
                                                                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                                                title="Reject"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Search Friends */}
                        <Card className={`relative overflow-hidden ${themeMode === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-zinc-200'} shadow-lg`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>

                            <div className="relative p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <Search className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Add Friends</h3>
                                </div>

                                <div className="relative mb-4">
                                    <input
                                        type="text"
                                        placeholder="Search username..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`w-full rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all ${themeMode === 'dark' ? 'bg-zinc-900/50 border border-white/10 text-white' : 'bg-zinc-100 border border-zinc-200 text-black'
                                            }`}
                                    />
                                    <Search className={`w-4 h-4 absolute left-3 top-3.5 ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`} />
                                </div>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {searchTerm.length > 0 && searchResults.length === 0 && (
                                        <div className="text-center py-6">
                                            <p className={`text-sm ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>No users found</p>
                                        </div>
                                    )}
                                    {searchResults.map(user => (
                                        <div key={user.id} className={`p-3 rounded-xl border transition-all hover:scale-[1.02] ${themeMode === 'dark' ? 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800/50' : 'bg-zinc-50 border-zinc-200 hover:bg-white'
                                            }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden ${themeMode === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-700'
                                                        }`}>
                                                        {user.avatarUrl ?
                                                            <img src={user.avatarUrl} className="w-full h-full object-cover" /> :
                                                            user.username[0].toUpperCase()
                                                        }
                                                    </div>
                                                    <div>
                                                        <div className={`font-bold text-sm ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                                                            {user.username}
                                                        </div>
                                                        <div className={`text-xs ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                                                            Level {user.level || 1} • {Math.floor(user.points)} MMR
                                                        </div>
                                                    </div>
                                                </div>
                                                {currentUser.friendRequests?.some(r => r.toId === user.id) ? (
                                                    <span className={`text-xs px-2 py-1 rounded-full ${themeMode === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
                                                        }`}>
                                                        Sent
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => sendFriendRequest(user.id)}
                                                        className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                                                        title="Add friend"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>

                    </div>
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
        </>
    );
};

export default FriendsView;
