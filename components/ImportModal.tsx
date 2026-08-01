import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Check, AlertCircle, X, Sparkles, CloudDownload, Key, FileJson, RefreshCw, Layers } from 'lucide-react';
import { JournalEntry } from '../types';
import { extractAutoTitle } from '../services/geminiService';
import { fetchMemoriesFromCloud, exportMemoriesAsJSON } from '../services/dbService';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportEntries: (entries: JournalEntry[], replaceExisting?: boolean) => void;
  currentEntriesCount: number;
}

const SAMPLE_STARTER_MEMORIES: JournalEntry[] = [
  {
    id: 'sample-1',
    content: "Started writing in Zournel today. The gentle afternoon sunlight was spilling through the window, making the room feel calm and warm. Took time to breathe and reflect on the week's progress.",
    createdAt: Date.now() - 86400000 * 3,
    title: 'A New Quiet Beginning',
    mood: 'Peaceful',
    aiInsight: 'Embracing quiet reflection helps ground your thoughts for the week ahead.'
  },
  {
    id: 'sample-2',
    content: "Took a long walk in the neighborhood park after dinner. The cool evening breeze and quiet trail made it easy to clear my mind and outline new creative projects.",
    createdAt: Date.now() - 86400000 * 7,
    title: 'Evening Stroll in the Park',
    mood: 'Reflective',
    aiInsight: 'Physical movement in nature frequently spark fresh creative insights.'
  },
  {
    id: 'sample-3',
    content: "Met up with old friends at a cozy coffee shop. We talked about travel memories and shared funny stories from years ago. It reminded me how valuable close relationships are.",
    createdAt: Date.now() - 86400000 * 14,
    title: 'Coffee & Fond Memories',
    mood: 'Joyful',
    aiInsight: 'Reconnecting with old friends reinforces long-lasting emotional well-being.'
  }
];

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportEntries,
  currentEntriesCount
}) => {
  const [activeSource, setActiveSource] = useState<'file' | 'cloud' | 'starter'>('file');
  const [dragOver, setDragOver] = useState(false);
  const [parsedEntries, setParsedEntries] = useState<JournalEntry[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  
  // Cloud fetch state
  const [cloudKeyInput, setCloudKeyInput] = useState('');
  const [isFetchingCloud, setIsFetchingCloud] = useState(false);
  const [cloudFetchSuccessMsg, setCloudFetchSuccessMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseJsonFile = (text: string) => {
    try {
      const data = JSON.parse(text);
      let list: any[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.entries)) {
        list = data.entries;
      } else if (data && typeof data === 'object') {
        list = [data];
      }

      const formatted: JournalEntry[] = list.map((item, index) => {
        const contentStr = typeof item.content === 'string' ? item.content : JSON.stringify(item);
        const timestamp = typeof item.createdAt === 'number' ? item.createdAt : 
                          item.createdAt ? new Date(item.createdAt).getTime() : Date.now() - index * 60000;
        return {
          id: item.id || `imported-${Date.now()}-${index}`,
          content: contentStr,
          createdAt: isNaN(timestamp) ? Date.now() : timestamp,
          title: item.title || extractAutoTitle(contentStr),
          mood: item.mood || undefined,
          image: item.image || undefined,
          aiInsight: item.aiInsight || undefined
        };
      }).filter(e => e.content && e.content.trim().length > 0);

      if (formatted.length === 0) {
        throw new Error("No valid memories found in JSON file.");
      }
      return formatted;
    } catch (err: any) {
      throw new Error(err.message || "Invalid JSON formatting.");
    }
  };

  const parseTextMarkdownFile = (text: string) => {
    // Split by horizontal rule '---' or double line breaks with headings
    const blocks = text.split(/\n(?=#{1,3}\s|\n---|\nDate:|\n\[\d{4}-\d{2}-\d{2}\])/gi).filter(b => b.trim().length > 0);
    const formatted: JournalEntry[] = blocks.map((block, index) => {
      const cleanBlock = block.replace(/^---/g, '').trim();
      const lines = cleanBlock.split('\n');
      let title = '';
      if (lines[0].startsWith('#')) {
        title = lines[0].replace(/^#+\s*/, '').trim();
      } else if (lines[0].length < 60) {
        title = lines[0].trim();
      }
      
      return {
        id: `imported-txt-${Date.now()}-${index}`,
        content: cleanBlock,
        createdAt: Date.now() - (blocks.length - index) * 86400000,
        title: title || extractAutoTitle(cleanBlock),
        mood: 'Reflective'
      };
    });

    if (formatted.length === 0) {
      // Fallback: entire text as single memory
      return [{
        id: `imported-txt-${Date.now()}-0`,
        content: text.trim(),
        createdAt: Date.now(),
        title: extractAutoTitle(text),
        mood: 'Reflective'
      }];
    }
    return formatted;
  };

  const handleFileProcess = (file: File) => {
    setErrorMsg('');
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error("File is empty.");

        let entries: JournalEntry[] = [];
        if (file.name.endsWith('.json')) {
          entries = parseJsonFile(text);
        } else {
          entries = parseTextMarkdownFile(text);
        }

        setParsedEntries(entries);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to process file.");
        setParsedEntries([]);
      }
    };

    reader.onerror = () => {
      setErrorMsg("Failed to read file.");
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleCloudFetch = async () => {
    if (!cloudKeyInput.trim()) {
      setErrorMsg("Please enter a device key or account ID.");
      return;
    }
    setIsFetchingCloud(true);
    setErrorMsg('');
    setCloudFetchSuccessMsg('');
    try {
      const remoteEntries = await fetchMemoriesFromCloud(cloudKeyInput.trim());
      if (remoteEntries && remoteEntries.length > 0) {
        setParsedEntries(remoteEntries);
        setCloudFetchSuccessMsg(`Successfully fetched ${remoteEntries.length} memories from cloud!`);
      } else {
        setErrorMsg("No remote memories found for that key.");
        setParsedEntries([]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to fetch remote memories.");
    } finally {
      setIsFetchingCloud(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedEntries.length === 0) return;
    onImportEntries(parsedEntries, replaceExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="bg-surface rounded-3xl border border-surface-highlight shadow-2xl p-6 sm:p-8 max-w-xl w-full relative overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-highlight/60">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent/15 text-accent rounded-2xl border border-accent/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-primary">Import Old Memories</h2>
              <p className="text-xs text-secondary">Restore from file backup, device key, or sample set</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-surface-highlight text-secondary hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-bg p-1.5 rounded-2xl border border-surface-highlight mb-6">
          <button
            type="button"
            onClick={() => { setActiveSource('file'); setErrorMsg(''); }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeSource === 'file' ? 'bg-surface text-accent shadow-xs border border-accent/15' : 'text-secondary hover:text-primary'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>File Backup</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSource('cloud'); setErrorMsg(''); }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeSource === 'cloud' ? 'bg-surface text-accent shadow-xs border border-accent/15' : 'text-secondary hover:text-primary'
            }`}
          >
            <CloudDownload className="w-3.5 h-3.5" />
            <span>Cloud Key</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSource('starter');
              setParsedEntries(SAMPLE_STARTER_MEMORIES);
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeSource === 'starter' ? 'bg-surface text-accent shadow-xs border border-accent/15' : 'text-secondary hover:text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Starter Set</span>
          </button>
        </div>

        {/* Tab 1: File Upload */}
        {activeSource === 'file' && (
          <div className="space-y-4">
            <div 
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition ${
                dragOver ? 'border-accent bg-accent/10' : 'border-surface-highlight hover:border-accent/50 bg-bg/50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json,.txt,.md,.csv" 
                onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])} 
              />
              <FileText className="w-10 h-10 text-accent/60 mx-auto mb-3" />
              <p className="text-sm font-bold text-primary mb-1">
                {fileName ? fileName : "Click or drag backup file here"}
              </p>
              <p className="text-xs text-secondary opacity-80">
                Supports .json, .txt, .md, or .csv journal exports
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Cloud Fetch */}
        {activeSource === 'cloud' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Device Key or Cloud Identifier</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={cloudKeyInput} 
                  onChange={(e) => setCloudKeyInput(e.target.value)}
                  placeholder="Paste Device Key or user ID..." 
                  className="flex-grow px-4 py-3 bg-bg border border-surface-highlight rounded-2xl text-xs font-mono text-primary outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleCloudFetch}
                  disabled={isFetchingCloud || !cloudKeyInput.trim()}
                  className="px-5 py-3 bg-accent text-accent-fg font-bold text-xs rounded-2xl hover:opacity-90 disabled:opacity-50 transition flex items-center gap-1.5 shrink-0"
                >
                  {isFetchingCloud ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                  <span>Fetch</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Starter Preset */}
        {activeSource === 'starter' && (
          <div className="p-4 bg-accent/5 border border-accent/15 rounded-2xl">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Nostalgic Starter Package</h4>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Includes 3 beautifully formatted starter memories with AI insights and mood tags to jumpstart your journal experience.
            </p>
          </div>
        )}

        {/* Success/Error Alerts */}
        {errorMsg && (
          <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {cloudFetchSuccessMsg && (
          <div className="mt-4 p-3.5 bg-accent/10 border border-accent/20 text-accent rounded-2xl text-xs flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 shrink-0" />
            <span>{cloudFetchSuccessMsg}</span>
          </div>
        )}

        {/* Parsed Preview */}
        {parsedEntries.length > 0 && (
          <div className="mt-6 pt-4 border-t border-surface-highlight/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">
                Ready to import <span className="text-accent">{parsedEntries.length} memories</span>
              </span>
              <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={replaceExisting} 
                  onChange={(e) => setReplaceExisting(e.target.checked)} 
                  className="rounded accent-accent"
                />
                <span>Replace existing ({currentEntriesCount})</span>
              </label>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {parsedEntries.slice(0, 5).map((entry, idx) => (
                <div key={idx} className="p-2.5 bg-bg rounded-xl border border-surface-highlight/50 text-xs flex items-center justify-between gap-3">
                  <div className="truncate flex-grow">
                    <span className="font-bold text-primary block truncate">{entry.title || 'Untitled Memory'}</span>
                    <span className="text-[10px] text-secondary opacity-70 truncate block">{entry.content}</span>
                  </div>
                  {entry.mood && (
                    <span className="text-[9px] font-bold text-accent px-2 py-0.5 bg-accent/10 rounded-full border border-accent/20 shrink-0">
                      {entry.mood}
                    </span>
                  )}
                </div>
              ))}
              {parsedEntries.length > 5 && (
                <p className="text-[10px] text-center text-secondary/60 italic">
                  + {parsedEntries.length - 5} more memories
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-surface-highlight/60">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-secondary hover:text-primary transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedEntries.length === 0}
            className="px-6 py-2.5 rounded-full bg-accent text-accent-fg text-xs font-bold hover:bg-accent/90 disabled:opacity-40 transition active:scale-[0.97] shadow-md flex items-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import {parsedEntries.length > 0 ? `${parsedEntries.length} Memories` : ''}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
