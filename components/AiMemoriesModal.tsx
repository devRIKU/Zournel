import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Plus, Trash2, Search, Check, Brain, Database, Layers, ArrowRight } from './Icons';
import { AiMemory, JournalEntry } from '../types';
import { getStoredMemories, addMemory, deleteMemory, retrieveOptimizedContext } from '../services/memoryService';

interface AiMemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalEntries: JournalEntry[];
  onMemoriesUpdated?: () => void;
}

const CATEGORIES: Array<{ id: AiMemory['category']; label: string; color: string }> = [
  { id: 'core_fact', label: 'Core Facts', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  { id: 'preference', label: 'Preferences', color: 'text-accent bg-accent/10 border-accent/20' },
  { id: 'goal', label: 'Goals & Dreams', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'relationship', label: 'People & Ties', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'theme', label: 'Themes & Values', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
];

export const AiMemoriesModal: React.FC<AiMemoriesModalProps> = ({
  isOpen,
  onClose,
  journalEntries,
  onMemoriesUpdated
}) => {
  const [memories, setMemories] = useState<AiMemory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newText, setNewText] = useState('');
  const [newCat, setNewCat] = useState<AiMemory['category']>('core_fact');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Test retrieval sandbox
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<ReturnType<typeof retrieveOptimizedContext> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMemories(getStoredMemories());
    }
  }, [isOpen]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const created = addMemory(newText, newCat, 'manual');
    setMemories(prev => [created, ...prev]);
    setNewText('');
    if (onMemoriesUpdated) onMemoriesUpdated();
  };

  const handleDelete = (id: string) => {
    const updated = deleteMemory(id);
    setMemories(updated);
    if (onMemoriesUpdated) onMemoriesUpdated();
  };

  const filteredMemories = useMemo(() => {
    return memories.filter(m => {
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      const matchSearch = !searchQuery.trim() || m.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [memories, selectedCategory, searchQuery]);

  const handleRunTest = () => {
    if (!testQuery.trim()) {
      setTestResult(null);
      return;
    }
    const res = retrieveOptimizedContext({
      query: testQuery,
      journalEntries,
      maxEntries: 3
    });
    setTestResult(res);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-surface-lowest text-primary border border-surface-highlight w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-surface-highlight flex items-center justify-between bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-display font-bold text-primary">AI Memory & Context System</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-surface-highlight/50 text-secondary border border-surface-highlight">
                  {memories.length} Facts Saved
                </span>
              </div>
              <p className="text-xs text-secondary/70 mt-0.5">
                Optimized selective recall: only relevant memories are injected per message.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-highlight/60 active:scale-95 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Index Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-surface border border-surface-highlight flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-secondary/70 block uppercase">Journal Memories</span>
                <span className="text-sm font-bold text-primary">{journalEntries.length} entries indexed</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-surface-highlight flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-secondary/70 block uppercase">Retrieval Strategy</span>
                <span className="text-sm font-bold text-primary">Semantic & Recency RAG</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-surface-highlight flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-secondary/70 block uppercase">Context Efficiency</span>
                <span className="text-sm font-bold text-primary">Top 3-4 snippets only</span>
              </div>
            </div>
          </div>

          {/* Add New Memory Form */}
          <form onSubmit={handleAdd} className="p-4 rounded-2xl bg-surface border border-surface-highlight space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary font-mono flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-accent" />
                Add Core Memory or Learned Preference
              </span>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as any)}
                className="bg-surface-highlight/50 border border-surface-highlight text-xs text-primary rounded-lg px-2.5 py-1 outline-none focus:border-accent"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. Preparing for thesis defense, prefers gentle constructive advice..."
                className="flex-1 bg-surface border border-surface-highlight rounded-xl px-3.5 py-2 text-sm text-primary placeholder:text-secondary/70 outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!newText.trim()}
                className="px-4 py-2 rounded-xl bg-accent text-accent-fg font-semibold text-xs hover:opacity-90 disabled:opacity-40 transition shrink-0"
              >
                Save Memory
              </button>
            </div>
          </form>

          {/* Filter & Search Bar */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 border ${
                    selectedCategory === 'all'
                      ? 'bg-accent text-accent-fg border-accent'
                      : 'bg-surface text-secondary/70 border-surface-highlight hover:text-primary'
                  }`}
                >
                  All ({memories.length})
                </button>
                {CATEGORIES.map(c => {
                  const count = memories.filter(m => m.category === c.id).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategory(c.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 border ${
                        selectedCategory === c.id
                          ? 'bg-surface-highlight/50 text-primary border-surface-highlight'
                          : 'bg-surface text-secondary/70 border-surface-highlight hover:text-primary'
                      }`}
                    >
                      {c.label} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-56 shrink-0">
                <Search className="w-3.5 h-3.5 text-secondary/70 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search memories..."
                  className="w-full bg-surface border border-surface-highlight rounded-xl pl-8 pr-3 py-1.5 text-xs text-primary placeholder:text-secondary/70 outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Memories List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredMemories.length === 0 ? (
                <div className="text-center py-8 text-xs text-secondary/70 border border-dashed border-surface-highlight rounded-2xl">
                  No explicit memories found in this category.
                </div>
              ) : (
                filteredMemories.map(item => {
                  const catMeta = CATEGORIES.find(c => c.id === item.category);
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-surface border border-surface-highlight/80 flex items-start justify-between gap-3 hover:border-accent/40 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${catMeta?.color || 'text-secondary/70 bg-surface-highlight/50 border-surface-highlight'}`}>
                            {catMeta?.label || item.category}
                          </span>
                          <span className="text-[10px] font-mono text-secondary/70">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-primary leading-relaxed">{item.text}</p>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-secondary/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0"
                        title="Delete memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Interactive Retrieval Preview Sandbox */}
          <div className="p-4 rounded-2xl bg-surface border border-surface-highlight space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary font-mono flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-accent" />
                Live Context Retrieval Sandbox
              </span>
              <span className="text-[10px] font-mono text-secondary/70">See what context the AI pulls for any query</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunTest()}
                placeholder="Test a query, e.g. 'feeling stressed about presentation' or 'last week workout'"
                className="flex-1 bg-surface border border-surface-highlight rounded-xl px-3.5 py-1.5 text-xs text-primary placeholder:text-secondary/70 outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={handleRunTest}
                className="px-3 py-1.5 rounded-xl bg-surface-highlight/50 hover:bg-surface-highlight text-primary text-xs font-medium transition shrink-0"
              >
                Inspect
              </button>
            </div>

            {testResult && (
              <div className="p-3 rounded-xl bg-surface border border-surface-highlight text-xs space-y-2">
                <div className="text-[11px] font-mono text-accent font-semibold flex items-center justify-between">
                  <span>Pulled {testResult.retrievedCount} relevant memories for: "{testQuery}"</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {testResult.referencedMemories.map(mem => (
                    <div key={mem.id} className="p-2 rounded-lg bg-surface-highlight/50/60 border border-surface-highlight/60">
                      <div className="flex items-center justify-between text-[10px] font-mono text-secondary/70 mb-0.5">
                        <span className="font-bold text-primary">{mem.title}</span>
                        <span>{mem.date}</span>
                      </div>
                      <p className="text-[11px] text-secondary italic">{mem.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-surface-highlight bg-surface flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-accent text-accent-fg font-semibold text-xs hover:opacity-90 transition"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
