import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import Card from './ui/Card';
import Button from './ui/Button';
import { Send, Lightbulb } from 'lucide-react';

const SuggestionsView = () => {
  const { themeMode, submitTicket } = useGame();
  const { tickets } = useGame();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !description.trim()) return;
    setSending(true);
    try {
      await submitTicket(
        'suggestion',
        title.trim() || 'Suggestion',
        description.trim() || '(No description)',
        { category: category.trim(), details: details.trim() }
      );
      setTitle('');
      setCategory('');
      setDescription('');
      setDetails('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center">
        <h2 className={`text-4xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
          SUGGESTIONS
        </h2>
        <p className="text-zinc-500 uppercase tracking-widest text-xs mt-2">Share your ideas for the site</p>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-6 text-zinc-400">
          <Lightbulb className="w-5 h-5" />
          <h3 className="text-sm font-bold uppercase tracking-widest">Submit a suggestion</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs uppercase tracking-wider mb-2 ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Short title for your suggestion"
              maxLength={120}
              className={`w-full rounded-xl p-3 border outline-none transition-colors ${
                themeMode === 'dark' ? 'bg-black/20 border-white/10 text-white placeholder:text-zinc-500 focus:border-rose-500' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-rose-500'
              }`}
            />
          </div>
          <div>
            <label className={`block text-xs uppercase tracking-wider mb-2 ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Category (e.g. UI, Features, Matchmaking)
            </label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Optional"
              maxLength={60}
              className={`w-full rounded-xl p-3 border outline-none ${
                themeMode === 'dark' ? 'bg-black/20 border-white/10 text-white placeholder:text-zinc-500' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
              }`}
            />
          </div>
          <div>
            <label className={`block text-xs uppercase tracking-wider mb-2 ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Description *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your suggestion in detail..."
              rows={4}
              className={`w-full rounded-xl p-3 border outline-none resize-none transition-colors ${
                themeMode === 'dark' ? 'bg-black/20 border-white/10 text-white placeholder:text-zinc-500 focus:border-rose-500' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-rose-500'
              }`}
            />
          </div>
          <div>
            <label className={`block text-xs uppercase tracking-wider mb-2 ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Additional details (optional)
            </label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Any extra context..."
              rows={2}
              className={`w-full rounded-xl p-3 border outline-none resize-none ${
                themeMode === 'dark' ? 'bg-black/20 border-white/10 text-white placeholder:text-zinc-500' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
              }`}
            />
          </div>
          <Button type="submit" disabled={sending || (!title.trim() && !description.trim())} className="w-full sm:w-auto">
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Submit suggestion
              </span>
            )}
          </Button>
        </form>
        <p className="text-xs text-zinc-500 mt-4">
          Your username will be visible to staff. Suggestions appear in the admin dashboard.
        </p>
      </Card>
      {/* Answered suggestions zone */}
      <Card className="mt-6">
        <div className="flex items-center gap-2 mb-4 text-zinc-400">
          <Lightbulb className="w-5 h-5" />
          <h3 className="text-sm font-bold uppercase tracking-widest">Answered suggestions</h3>
        </div>
        {tickets && tickets.filter(t => t.type === 'suggestion' && t.reply).length > 0 ? (
          <div className="space-y-3">
            {tickets
              .filter(t => t.type === 'suggestion' && t.reply)
              .map(t => (
                <div key={t.id} className="p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{t.subject || (t.parts && t.parts.title) || 'Suggestion'}</div>
                    <div className="text-xs text-zinc-500">by {t.username} • answered by {t.reply?.replierUsername}</div>
                    <div className="mt-2 text-zinc-300 text-sm">{t.reply?.text}</div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">No answered suggestions yet.</p>
        )}
      </Card>
    </div>
  );
};

export default SuggestionsView;
