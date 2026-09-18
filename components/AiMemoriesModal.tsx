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
  { id: 'preference', label: 'Preferences', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-[#141416] text-slate-100 border border-neutral-800 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between bg-[#19191d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-display font-bold text-slate-100">AI Memory & Context System</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-neutral-800 text-slate-300 border border-neutral-700">
                  {memories.length} Facts Saved
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Optimized selective recall: only relevant memories are injected per message.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-100 hover:bg-neutral-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Index Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#1b1b20] border border-neutral-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Journal Memories</span>
                <span className="text-sm font-bold text-slate-200">{journalEntries.length} entries indexed</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#1b1b20] border border-neutral-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Retrieval Strategy</span>
                <span className="text-sm font-bold text-slate-200">Semantic & Recency RAG</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#1b1b20] border border-neutral-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Context Efficiency</span>
                <span className="text-sm font-bold text-slate-200">Top 3-4 snippets only</span>
              </div>
            </div>
          </div>

          {/* Add New Memory Form */}
          <form onSubmit={handleAdd} className="p-4 rounded-2xl bg-[#1a1a1f] border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-accent" />
                Add Core Memory or Learned Preference
              </span>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as any)}
                className="bg-neutral-800 border border-neutral-700 text-xs text-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-accent"
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
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-accent"
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
                      : 'bg-neutral-900 text-slate-400 border-neutral-800 hover:text-slate-200'
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
                          ? 'bg-neutral-800 text-slate-100 border-neutral-600'
                          : 'bg-neutral-900 text-slate-400 border-neutral-800 hover:text-slate-200'
                      }`}
                    >
                      {c.label} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-56 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search memories..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Memories List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredMemories.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-neutral-800 rounded-2xl">
                  No explicit memories found in this category.
                </div>
              ) : (
                filteredMemories.map(item => {
                  const catMeta = CATEGORIES.find(c => c.id === item.category);
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#18181c] border border-neutral-800/80 flex items-start justify-between gap-3 hover:border-neutral-700 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${catMeta?.color || 'text-slate-400 bg-neutral-800 border-neutral-700'}`}>
                            {catMeta?.label || item.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{item.text}</p>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0"
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
          <div className="p-4 rounded-2xl bg-[#17171b] border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-accent" />
                Live Context Retrieval Sandbox
              </span>
              <span className="text-[10px] font-mono text-slate-400">See what context the AI pulls for any query</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunTest()}
                placeholder="Test a query, e.g. 'feeling stressed about presentation' or 'last week workout'"
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={handleRunTest}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-200 text-xs font-medium transition shrink-0"
              >
                Inspect
              </button>
            </div>

            {testResult && (
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs space-y-2">
                <div className="text-[11px] font-mono text-accent font-semibold flex items-center justify-between">
                  <span>Pulled {testResult.retrievedCount} relevant memories for: "{testQuery}"</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {testResult.referencedMemories.map(mem => (
                    <div key={mem.id} className="p-2 rounded-lg bg-neutral-800/60 border border-neutral-700/60">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                        <span className="font-bold text-slate-200">{mem.title}</span>
                        <span>{mem.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 italic">{mem.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-800 bg-[#19191d] flex items-center justify-end">
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
