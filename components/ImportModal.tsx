import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Check, AlertCircle, X, Sparkles, CloudDownload, FileJson, RefreshCw, Code } from './Icons';
import { JournalEntry } from '../types';
import { extractAutoTitle } from '../services/geminiService';
import { fetchMemoriesFromCloud } from '../services/dbService';

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

export const parseJsonContent = (text: string): JournalEntry[] => {
  if (!text || !text.trim()) {
    throw new Error("JSON content is empty.");
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    // Attempt cleaning trailing commas or double braces
    try {
      const cleaned = text.replace(/,\s*([\]}])/g, '$1');
      data = JSON.parse(cleaned);
    } catch (err) {
      throw new Error("Invalid JSON syntax. Please verify the JSON formatting.");
    }
  }

  let list: any[] = [];

  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object') {
    // Check known keys that hold array of memories/entries
    const possibleArrayKeys = ['entries', 'memories', 'journalEntries', 'journal', 'items', 'posts', 'notes', 'data', 'logs', 'history', 'records'];
    let foundArrayKey = false;
    for (const key of possibleArrayKeys) {
      if (Array.isArray(data[key])) {
        list = data[key];
        foundArrayKey = true;
        break;
      }
    }

    if (!foundArrayKey) {
      // Check if any value inside object is an array
      const anyArrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
      if (anyArrayKey) {
        list = data[anyArrayKey];
      } else if (data.content || data.text || data.body || data.entry || data.note || data.title) {
        // Assume the single object itself is a single memory
        list = [data];
      } else {
        // Check if object is a key-value dictionary (e.g. { "2026-08-01": "Text", "2026-08-02": {...} })
        const keys = Object.keys(data);
        if (keys.length > 0) {
          list = keys.map(k => {
            const val = data[k];
            if (typeof val === 'string') {
              return { dateKey: k, content: val };
            }
            if (val && typeof val === 'object') {
              return { dateKey: k, ...val };
            }
            return null;
          }).filter(Boolean);
        } else {
          list = [data];
        }
      }
    }
  }

  const formattedEntries: JournalEntry[] = list.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `imported-${Date.now()}-${index}`,
        content: item,
        createdAt: Date.now() - index * 60000,
        title: extractAutoTitle(item)
      };
    }

    if (!item || typeof item !== 'object') {
      return null;
    }

    // Determine content string from various common fields (content, text, body, entry, note, description, markdown, message)
    const content = 
      item.content || 
      item.text || 
      item.body || 
      item.entry || 
      item.note || 
      item.description || 
      item.markdown || 
      item.message || 
      (typeof item.journal === 'string' ? item.journal : null);

    const finalContent = typeof content === 'string' && content.trim() 
      ? content.trim() 
      : (item.content ? String(item.content) : JSON.stringify(item));

    // Determine timestamp
    const rawDate = 
      item.createdAt || 
      item.created_at || 
      item.timestamp || 
      item.date || 
      item.dateKey ||
      item.time || 
      item.creationDate || 
      item.creation_date || 
      item.published_at;

    let timestamp = Date.now() - index * 60000;
    if (typeof rawDate === 'number') {
      // Unix timestamp in seconds vs milliseconds
      timestamp = rawDate < 10000000000 ? rawDate * 1000 : rawDate;
    } else if (typeof rawDate === 'string' && rawDate.trim()) {
      const parsed = new Date(rawDate).getTime();
      if (!isNaN(parsed)) {
        timestamp = parsed;
      }
    }

    // Determine title
    const rawTitle = item.title || item.subject || item.name || item.heading || item.header;
    const title = typeof rawTitle === 'string' && rawTitle.trim() ? rawTitle.trim() : extractAutoTitle(finalContent);

    // Determine mood
    const mood = typeof item.mood === 'string' ? item.mood : typeof item.sentiment === 'string' ? item.sentiment : undefined;

    // Determine image
    const image = typeof item.image === 'string' ? item.image : typeof item.img === 'string' ? item.img : typeof item.photo === 'string' ? item.photo : typeof item.imageUrl === 'string' ? item.imageUrl : undefined;

    // Determine AI insight
    const aiInsight = typeof item.aiInsight === 'string' ? item.aiInsight : typeof item.ai_insight === 'string' ? item.ai_insight : typeof item.insight === 'string' ? item.insight : undefined;

    return {
      id: item.id && typeof item.id === 'string' ? item.id : `imported-${Date.now()}-${index}`,
      content: finalContent,
      createdAt: isNaN(timestamp) ? Date.now() : timestamp,
      title,
      mood,
      image,
      aiInsight
    };
  }).filter((entry): entry is JournalEntry => entry !== null && Boolean(entry.content && entry.content.trim().length > 0));

  if (formattedEntries.length === 0) {
    throw new Error("No valid memory records found in JSON data.");
  }

  return formattedEntries;
};

export const parseTextMarkdownFile = (text: string): JournalEntry[] => {
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

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportEntries,
  currentEntriesCount
}) => {
  const [activeSource, setActiveSource] = useState<'file' | 'paste' | 'cloud' | 'starter'>('file');
  const [dragOver, setDragOver] = useState(false);
  const [parsedEntries, setParsedEntries] = useState<JournalEntry[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  
  // Cloud fetch state
  const [cloudKeyInput, setCloudKeyInput] = useState('');
  const [isFetchingCloud, setIsFetchingCloud] = useState(false);
  const [cloudFetchSuccessMsg, setCloudFetchSuccessMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processTextContent = (text: string, filename?: string) => {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Content is empty.");

    const isJsonLike = trimmed.startsWith('[') || trimmed.startsWith('{') || (filename && filename.toLowerCase().endsWith('.json'));

    if (isJsonLike) {
      try {
        return parseJsonContent(trimmed);
      } catch (jsonErr: any) {
        if (filename && filename.toLowerCase().endsWith('.json')) {
          throw jsonErr;
        }
      }
    }

    return parseTextMarkdownFile(trimmed);
  };

  const handleFileProcess = (file: File) => {
    setErrorMsg('');
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error("File is empty.");

        const entries = processTextContent(text, file.name);
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

  const handleParsePastedText = () => {
    setErrorMsg('');
    if (!pastedText.trim()) {
      setErrorMsg("Please paste JSON or text content first.");
      return;
    }
    try {
      const entries = processTextContent(pastedText);
      setParsedEntries(entries);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to parse pasted content.");
      setParsedEntries([]);
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
      const remoteData = await fetchMemoriesFromCloud(cloudKeyInput.trim());
      if (remoteData && remoteData.entries && remoteData.entries.length > 0) {
        setParsedEntries(remoteData.entries);
        setCloudFetchSuccessMsg(`Successfully fetched ${remoteData.entries.length} memories from cloud!`);
      } else {
        setErrorMsg("No remote memories found for that device key.");
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
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
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
              <p className="text-xs text-secondary">Restore from JSON file backup, raw text paste, device key, or sample set</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-bg p-1.5 rounded-2xl border border-surface-highlight mb-6">
          <button
            type="button"
            onClick={() => { setActiveSource('file'); setErrorMsg(''); }}
            className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
              activeSource === 'file' ? 'bg-surface text-accent shadow-xs border border-accent/15' : 'text-secondary hover:text-primary'
            }`}
          >
            <FileJson className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">JSON File</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSource('paste'); setErrorMsg(''); }}
            className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
              activeSource === 'paste' ? 'bg-surface text-accent shadow-xs border border-accent/15' : 'text-secondary hover:text-primary'
            }`}
          >
            <Code className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Paste Text</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSource('cloud'); setErrorMsg(''); }}
            className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
              activeSource === 'cloud' ? 'bg-surface text-accent shadow-xs border border-accent/15' : 'text-secondary hover:text-primary'
            }`}
          >
            <CloudDownload className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cloud Key</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSource('starter');
              setParsedEntries(SAMPLE_STARTER_MEMORIES);
              setErrorMsg('');
            }}
            className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
              activeSource === 'starter' ? 'bg-surface text-accent shadow-xs border border-accent/15' : 'text-secondary hover:text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Starter Set</span>
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
              <FileJson className="w-10 h-10 text-accent/60 mx-auto mb-3" />
              <p className="text-sm font-bold text-primary mb-1">
                {fileName ? fileName : "Click or drag JSON / text backup file here"}
              </p>
              <p className="text-xs text-secondary opacity-80">
                Supports .json arrays/objects, Day One exports, .md, .txt
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Paste Raw JSON / Text */}
        {activeSource === 'paste' && (
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
              Paste JSON Array or Raw Markdown Text
            </label>
            <textarea
              rows={5}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`Paste raw JSON array or markdown text here...\nExample:\n[\n  { "title": "First Memory", "content": "Hello world" }\n]`}
              className="w-full p-3.5 bg-bg border border-surface-highlight rounded-2xl text-xs font-mono text-primary outline-none focus:border-accent placeholder:text-secondary/40"
            />
            <button
              type="button"
              onClick={handleParsePastedText}
              disabled={!pastedText.trim()}
              className="w-full py-2.5 bg-accent text-accent-fg font-bold text-xs rounded-xl hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Parse Content</span>
            </button>
          </div>
        )}

        {/* Tab 3: Cloud Fetch */}
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

        {/* Tab 4: Starter Preset */}
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
