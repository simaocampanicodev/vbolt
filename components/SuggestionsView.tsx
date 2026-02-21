import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import Card from './ui/Card';
import Button from './ui/Button';
import {
  Send, Lightbulb, Heart, Trash2, TrendingUp, Code, CheckCircle, Flame,
  ChevronDown, ChevronUp
} from 'lucide-react';

type SectionKey = 'Priority' | 'In Development' | 'Completed' | 'Ideas';

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode; accent: string; glow: string }[] = [
  {
    key: 'Priority',
    label: 'Priority',
    icon: <Flame className="w-3.5 h-3.5" />,
    accent: 'border-rose-500/40 bg-rose-500/5',
    glow: 'shadow-[0_0_18px_rgba(244,63,94,0.08)]',
  },
  {
    key: 'In Development',
    label: 'In Dev',
    icon: <Code className="w-3.5 h-3.5" />,
    accent: 'border-blue-500/40 bg-blue-500/5',
    glow: 'shadow-[0_0_18px_rgba(59,130,246,0.08)]',
  },
  {
    key: 'Completed',
    label: 'Completed',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    accent: 'border-emerald-500/40 bg-emerald-500/5',
    glow: 'shadow-[0_0_18px_rgba(16,185,129,0.08)]',
  },
  {
    key: 'Ideas',
    label: 'Ideas',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    accent: 'border-zinc-500/30 bg-zinc-500/5',
    glow: '',
  },
];

const SECTION_HEADER_COLORS: Record<SectionKey, string> = {
  Priority: 'text-rose-400',
  'In Development': 'text-blue-400',
  Completed: 'text-emerald-400',
  Ideas: 'text-zinc-400',
};

const CATEGORY_BADGE: Record<SectionKey, string> = {
  Priority: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'In Development': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Ideas: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/30',
};

const ADMIN_CATEGORIES: SectionKey[] = ['Priority', 'In Development', 'Completed', 'Ideas'];

const SuggestionsView = () => {
  const { themeMode, submitTicket, allUsers, currentUser, updateTicket, tickets, isAdmin } = useGame();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSending(true);
    try {
      await submitTicket('suggestion', title.trim(), description.trim(), {});
      setTitle('');
      setDescription('');
      setFormOpen(false);
    } finally {
      setSending(false);
    }
  };

  const handleLike = async (ticketId: string, currentLikes: string[]) => {
    if (!currentUser) return;
    const alreadyLiked = currentLikes.includes(currentUser.id);
    const newLikes = alreadyLiked
      ? currentLikes.filter(id => id !== currentUser.id)
      : [...currentLikes, currentUser.id];
    try {
      await updateTicket(ticketId, { likes: newLikes });
    } catch (error) {
      console.error('Error liking/unliking suggestion:', error);
    }
  };

  const handleCategoryChange = async (ticketId: string, category: string) => {
    try {
      await updateTicket(ticketId, { category });
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!confirm('Remove this suggestion?')) return;
    try {
      await updateTicket(ticketId, { deleted: true });
    } catch (error) {
      console.error('Error deleting suggestion:', error);
    }
  };

  const activeSuggestions = (tickets ?? []).filter(
    t => t.type === 'suggestion' && !t.deleted
  );

  const grouped: Record<SectionKey, typeof activeSuggestions> = {
    Priority: [],
    'In Development': [],
    Completed: [],
    Ideas: [],
  };
  activeSuggestions.forEach(t => {
    const cat = (t.category as SectionKey) || 'Ideas';
    if (cat in grouped) grouped[cat as SectionKey].push(t);
    else grouped['Ideas'].push(t);
  });
  // Sort each section newest first
  (Object.keys(grouped) as SectionKey[]).forEach(k => {
    grouped[k].sort((a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0));
  });

  const dark = themeMode === 'dark';

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Page Header ── */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className={`text-4xl font-display font-bold tracking-tight ${dark ? 'text-white' : 'text-black'}`}>
            Suggestions
          </h2>
          <p className="text-zinc-500 uppercase tracking-widest text-[10px] mt-1">
            Vote & share ideas for the platform
          </p>
        </div>
        <button
          onClick={() => setFormOpen(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm font-medium hover:bg-rose-500/20 transition-all"
        >
          <Lightbulb className="w-4 h-4" />
          Submit idea
          {formOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── Submit Form (collapsible) ── */}
      {formOpen && (
        <Card className="mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] uppercase tracking-wider mb-1.5 ${dark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Short, descriptive title"
                  maxLength={120}
                  className={`w-full rounded-xl p-3 border outline-none transition-colors text-sm ${dark
                    ? 'bg-black/30 border-white/10 text-white placeholder:text-zinc-600 focus:border-rose-500/60'
                    : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-rose-400'
                    }`}
                />
              </div>
              <div>
                <label className={`block text-[10px] uppercase tracking-wider mb-1.5 ${dark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Explain your idea in detail..."
                  rows={3}
                  className={`w-full rounded-xl p-3 border outline-none resize-none transition-colors text-sm ${dark
                    ? 'bg-black/30 border-white/10 text-white placeholder:text-zinc-600 focus:border-rose-500/60'
                    : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-rose-400'
                    }`}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={sending || !title.trim() || !description.trim()} size="sm">
                {sending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5" />
                    Submit
                  </span>
                )}
              </Button>
              <p className={`text-[10px] ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Your username is visible to staff.
              </p>
            </div>
          </form>
        </Card>
      )}

      {/* ── 4-Column Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {SECTIONS.map(section => {
          const list = grouped[section.key];
          return (
            <div key={section.key} className="flex flex-col gap-3">
              {/* Column Header */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${section.accent} ${section.glow}`}>
                <span className={SECTION_HEADER_COLORS[section.key]}>{section.icon}</span>
                <span className={`text-xs font-bold uppercase tracking-widest ${SECTION_HEADER_COLORS[section.key]}`}>
                  {section.label}
                </span>
                <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${CATEGORY_BADGE[section.key]}`}>
                  {list.length}
                </span>
              </div>

              {/* Suggestion Cards */}
              {list.length === 0 ? (
                <div className={`text-center py-8 rounded-xl border border-dashed ${dark ? 'border-white/5 text-zinc-700' : 'border-black/5 text-zinc-400'} text-xs`}>
                  No suggestions
                </div>
              ) : (
                list.map(t => {
                  const author = allUsers.find(u => u.id === t.userId);
                  const likes = t.likes || [];
                  const isLiked = currentUser && likes.includes(currentUser.id);

                  return (
                    <div
                      key={t.id}
                      className={`group relative flex flex-col gap-2 p-3 rounded-xl border transition-all duration-200 ${dark
                        ? 'bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-white/15'
                        : 'bg-black/[0.02] border-black/8 hover:bg-black/[0.05]'
                        }`}
                    >
                      {/* Author row */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800 ring-1 ring-white/10">
                          {author?.avatarUrl
                            ? <img src={author.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : <span className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white">{t.username[0]?.toUpperCase()}</span>
                          }
                        </div>
                        <span className={`text-[11px] font-semibold truncate flex-1 ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          {t.username}
                        </span>
                        <span className={`text-[9px] flex-shrink-0 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                          {new Date(t.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>

                      {/* Title */}
                      <p className={`text-xs font-bold leading-snug ${dark ? 'text-white' : 'text-black'}`}>
                        {t.subject || 'Suggestion'}
                      </p>

                      {/* Description */}
                      <p className={`text-[11px] leading-relaxed line-clamp-3 ${dark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                        {t.message}
                      </p>

                      {/* Actions row */}
                      <div className="flex items-center justify-between pt-1">
                        {/* Like button */}
                        <button
                          onClick={() => handleLike(t.id, likes)}
                          disabled={!currentUser}
                          title={isLiked ? 'Unlike' : 'Like'}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-[11px] font-semibold ${isLiked
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : dark
                              ? 'bg-white/5 text-zinc-500 border border-white/8 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/25'
                              : 'bg-black/5 text-zinc-400 border border-black/8 hover:text-rose-500 hover:bg-rose-500/10'
                            }`}
                        >
                          <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
                          {likes.length}
                        </button>

                        {/* Admin controls */}
                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={t.category || 'Ideas'}
                              onChange={e => handleCategoryChange(t.id, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className={`text-[10px] px-1.5 py-1 rounded-lg border outline-none cursor-pointer ${dark
                                ? 'bg-zinc-900 border-white/10 text-zinc-300'
                                : 'bg-white border-zinc-200 text-zinc-700'
                                }`}
                            >
                              {ADMIN_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestionsView;
