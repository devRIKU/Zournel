import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { 
  ArrowLeft, Sparkles, Wand2, RefreshCw, Save, ImageIcon, X, Plus, 
  Paperclip, CheckCircle, MoreHorizontal, AlignLeft, Bold, Italic, 
  List, Quote, Code, Undo, Redo
} from 'lucide-react';
import { Editor, rootCtx, defaultValueCtx, commandsCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { Milkdown, useEditor, MilkdownProvider } from '@milkdown/react';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll } from '@milkdown/utils';
import { editJournalText, generateCoverImage } from '../services/geminiService';

interface JournalEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string, image: string | undefined) => void;
  initialContent?: string;
  initialImage?: string;
  initialId?: string;
  selectedModel?: string;
}

const AESTHETIC_COLLECTION = [
  'https://images.unsplash.com/photo-1499750310159-5b5f0969206b?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1200',
];

const getRandomCover = () => AESTHETIC_COLLECTION[Math.floor(Math.random() * AESTHETIC_COLLECTION.length)];
const DRAFT_KEY = 'mf_journal_draft';

// Debounce helper to prevent heavy serialization on every keypress
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeout: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * EditorInstance manages the heavy Milkdown lifecycle.
 * Keyed by initialId to reset when switching entries.
 */
const EditorInstance = memo(({ defaultValue, onMarkdownUpdate, onEditorReady }: { 
  defaultValue: string; 
  onMarkdownUpdate: (markdown: string) => void;
  onEditorReady: (editor: Editor) => void;
}) => {
  const initialValueRef = useRef(defaultValue);
  
  // We debounce the update callback to eliminate lag in long documents
  const debouncedUpdate = useMemo(() => debounce(onMarkdownUpdate, 300), [onMarkdownUpdate]);

  useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialValueRef.current);
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          debouncedUpdate(markdown);
        });
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(listener);
    
    onEditorReady(editor);
    return editor;
  }, [debouncedUpdate, onEditorReady]);

  return <Milkdown />;
});

/**
 * Memoized Toolbar to keep the editor container focused on writing.
 */
const EditorToolbar = memo(({ 
  onCommand, 
  onShowImagePrompt, 
  onAiEdit, 
  isProcessing,
  showAiMenu,
  setShowAiMenu,
  aiMenuRef 
}: {
  onCommand: (id: string) => void;
  onShowImagePrompt: () => void;
  onAiEdit: (type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE') => void;
  isProcessing: boolean;
  showAiMenu: boolean;
  setShowAiMenu: (show: boolean) => void;
  aiMenuRef: React.RefObject<HTMLDivElement | null>;
}) => {
  return (
    <div className="sticky top-6 flex justify-center z-40 px-4 mt-6">
      <div className="flex items-center justify-center gap-1 p-1.5 bg-surface border border-surface-highlight shadow-xl rounded-full sm:rounded-3xl max-w-full">
        {/* History Group */}
        <div className="flex items-center border-r border-surface-highlight pr-1">
          <button onClick={() => onCommand('Undo')} title="Undo" className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary transition-all active:scale-90"><Undo className="w-4 h-4"/></button>
          <button onClick={() => onCommand('Redo')} title="Redo" className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary transition-all active:scale-90"><Redo className="w-4 h-4"/></button>
        </div>

        {/* Formatting Group */}
        <div className="flex items-center border-r border-surface-highlight pr-1 pl-1">
          <button onClick={() => onCommand('ToggleStrong')} title="Bold" className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary transition-all active:scale-90"><Bold className="w-4 h-4"/></button>
          <button onClick={() => onCommand('ToggleEmphasis')} title="Italic" className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary transition-all active:scale-90"><Italic className="w-4 h-4"/></button>
        </div>

        {/* Structure Group */}
        <div className="flex items-center border-r border-surface-highlight pr-1 pl-1">
          <button onClick={() => onCommand('WrapInBulletList')} title="Bullet List" className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary transition-all active:scale-90"><List className="w-4 h-4"/></button>
          <button onClick={() => onCommand('WrapInBlockquote')} title="Quote" className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary transition-all active:scale-90"><Quote className="w-4 h-4"/></button>
          <button onClick={() => onCommand('ToggleInlineCode')} title="Code" className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary transition-all active:scale-90"><Code className="w-4 h-4"/></button>
          <button onClick={onShowImagePrompt} title="Add Image" className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary transition-all active:scale-90"><ImageIcon className="w-4 h-4"/></button>
        </div>

        {/* AI Assistant Menu */}
        <div className="flex items-center relative pl-1" ref={aiMenuRef}>
          <div className="hidden md:flex items-center">
            <button onClick={() => onAiEdit('IMPROVE')} disabled={isProcessing} className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/10 hover:text-accent rounded-xl text-secondary font-bold text-[9px] uppercase tracking-widest transition-all">
              <Wand2 className="w-3.5 h-3.5"/> Refine
            </button>
            <button onClick={() => onAiEdit('REPHRASE')} disabled={isProcessing} className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/10 hover:text-accent rounded-xl text-secondary font-bold text-[9px] uppercase tracking-widest transition-all">
              <RefreshCw className="w-3.5 h-3.5"/> Rewrite
            </button>
            <button onClick={() => onAiEdit('SUMMARIZE')} disabled={isProcessing} className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/10 hover:text-accent rounded-xl text-secondary font-bold text-[9px] uppercase tracking-widest transition-all">
              <AlignLeft className="w-3.5 h-3.5"/> Sum
            </button>
          </div>
          <div className="md:hidden">
            <button onClick={() => setShowAiMenu(!showAiMenu)} className={`p-2.5 rounded-xl transition-all ${showAiMenu ? 'bg-accent text-accent-fg' : 'text-secondary hover:bg-surface-highlight'}`}>
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showAiMenu && (
              <div className="absolute top-full mt-3 right-0 w-48 bg-surface border border-surface-highlight rounded-2xl shadow-2xl p-2 flex flex-col gap-1 z-[60] animate-scale-in">
                <button onClick={() => onAiEdit('IMPROVE')} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/10 text-primary text-xs font-bold uppercase tracking-wider rounded-xl transition-all"><Wand2 className="w-4 h-4 text-accent"/> Refine Entry</button>
                <button onClick={() => onAiEdit('REPHRASE')} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/10 text-primary text-xs font-bold uppercase tracking-wider rounded-xl transition-all"><RefreshCw className="w-4 h-4 text-accent"/> Rewrite Draft</button>
                <button onClick={() => onAiEdit('SUMMARIZE')} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/10 text-primary text-xs font-bold uppercase tracking-wider rounded-xl transition-all"><AlignLeft className="w-4 h-4 text-accent"/> Summarize</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export const JournalEditor: React.FC<JournalEditorProps> = ({ 
  isOpen, onClose, onSave, initialContent = '', initialImage, initialId, selectedModel 
}) => {
  const [image, setImage] = useState<string>(initialImage || getRandomCover());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [imgUrlInput, setImgUrlInput] = useState('');
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const contentRef = useRef(initialContent);
  const editorRef = useRef<Editor | null>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const localImageInputRef = useRef<HTMLInputElement>(null);
  const localCoverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setImage(initialImage || getRandomCover());
      setImageLoaded(false);
      contentRef.current = initialContent;
    }
  }, [isOpen, initialContent, initialImage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(event.target as Node)) {
        setShowAiMenu(false);
      }
    };
    if (showAiMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAiMenu]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const currentText = contentRef.current;
      if (currentText.trim() && currentText !== initialContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ content: currentText, image, timestamp: Date.now() }));
        setShowSaveIndicator(true);
        setTimeout(() => setShowSaveIndicator(false), 2000);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isOpen, image, initialContent]);

  const handleManualSave = useCallback(() => {
    onSave(contentRef.current, image);
    localStorage.removeItem(DRAFT_KEY);
    onClose();
  }, [image, onSave, onClose]);

  const handleContentUpdate = useCallback((val: string) => {
    contentRef.current = val;
  }, []);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  const execCommand = useCallback((commandId: string) => {
    if (editorRef.current) {
      editorRef.current.action((ctx) => {
        const commandManager = ctx.get(commandsCtx);
        commandManager.call(commandId);
      });
    }
  }, []);

  const handleAIEdit = useCallback(async (type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE') => {
    const currentText = contentRef.current;
    if (!currentText.trim()) return;
    setIsProcessing(true);
    setShowAiMenu(false);
    try {
      const newText = await editJournalText(currentText, type, selectedModel);
      editorRef.current?.action(replaceAll(newText));
      contentRef.current = newText;
    } catch (e) {
      console.error("AI Error:", e);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedModel]);

  const handleGenerateCover = useCallback(async () => {
    setIsProcessing(true);
    try {
      const generated = await generateCoverImage(contentRef.current.slice(0, 150));
      if (generated) {
        setImage(generated);
        setImageLoaded(false);
      }
    } catch (e) {
      console.error("Cover Gen Error:", e);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-bg flex flex-col animate-fade-in overflow-hidden" role="dialog" aria-modal="true">
      {/* Cover Section */}
      <div className="relative h-[40vh] sm:h-[45vh] shrink-0 w-full overflow-hidden bg-surface-highlight">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-highlight">
            <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          </div>
        )}
        <img 
          src={image} 
          className={`w-full h-full object-cover transition-opacity duration-1000 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} 
          alt="Entry cover" 
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-bg"></div>
        
        <div className="absolute top-0 left-0 w-full p-6 sm:p-8 flex justify-between items-center z-50">
          <button 
            onClick={onClose} 
            className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl text-white hover:bg-white/30 transition-all active:scale-90 outline-none"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={handleManualSave} 
            className="px-6 py-3 sm:px-8 sm:py-4 bg-accent text-accent-fg rounded-2xl text-sm font-bold shadow-2xl hover:bg-accent/90 active:scale-95 transition-all flex items-center gap-3 border border-white/10 outline-none"
          >
            <Save className="w-5 h-5" />
            <span className="hidden sm:inline">Save Entry</span>
          </button>
        </div>

        <div className="absolute bottom-12 right-6 sm:right-12 flex flex-col sm:flex-row gap-3 z-50">
          <div className="flex bg-white/10 backdrop-blur-xl p-1.5 rounded-2xl border border-white/20 shadow-2xl items-center">
            {AESTHETIC_COLLECTION.slice(0, 3).map((url) => (
              <button 
                key={url} 
                onClick={() => { setImage(url); setImageLoaded(false); }} 
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden border-2 m-1 transition-all ${image === url ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <img src={url} className="w-full h-full object-cover" alt="Preset" />
              </button>
            ))}
            <button 
              onClick={() => localCoverInputRef.current?.click()} 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 border-white/20 m-1 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
            <input type="file" ref={localCoverInputRef} className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setImage(URL.createObjectURL(file)); setImageLoaded(false); }
            }} />
          </div>
          <button 
            onClick={handleGenerateCover} 
            disabled={isProcessing} 
            className={`flex items-center justify-center gap-2 px-4 py-3 sm:px-6 sm:py-4 bg-white/20 backdrop-blur-xl text-white border border-white/20 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/30 transition-all ${isProcessing ? 'animate-pulse' : 'active:scale-95'}`}
          >
            <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">AI Gen</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-bg flex flex-col overflow-hidden relative z-20 -mt-10 rounded-t-[3rem] sm:rounded-t-[3.5rem] shadow-[-10px_-10px_60px_-10px_rgba(0,0,0,0.1)]">
        
        <EditorToolbar 
          onCommand={execCommand}
          onShowImagePrompt={() => setShowImagePrompt(true)}
          onAiEdit={handleAIEdit}
          isProcessing={isProcessing}
          showAiMenu={showAiMenu}
          setShowAiMenu={setShowAiMenu}
          aiMenuRef={aiMenuRef}
        />

        <div className="flex-1 overflow-y-auto no-scrollbar pt-10 px-6 sm:px-10 pb-32">
          <div className="max-w-4xl mx-auto min-h-[50vh]">
            <MilkdownProvider>
              <EditorInstance 
                key={initialId || 'new'}
                defaultValue={initialContent} 
                onMarkdownUpdate={handleContentUpdate}
                onEditorReady={handleEditorReady}
              />
            </MilkdownProvider>
          </div>
        </div>

        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 sm:left-10 sm:translate-x-0 transition-all duration-300 z-50 ${showSaveIndicator ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-surface/90 backdrop-blur-md rounded-full border border-surface-highlight shadow-lg">
             <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
             <span className="text-[9px] font-bold uppercase tracking-widest text-secondary">Draft Saved</span>
          </div>
        </div>
      </div>

      {showImagePrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" role="dialog" aria-modal="true">
          <div className="bg-surface rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-white/5 animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-display font-bold text-primary">Add Visual</h3>
              <button onClick={() => setShowImagePrompt(false)} className="p-2 hover:bg-surface-highlight rounded-xl transition-all active:scale-90"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-6">
              <button onClick={() => localImageInputRef.current?.click()} className="w-full py-8 bg-surface-highlight hover:bg-accent hover:text-accent-fg border-2 border-dashed border-accent/20 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all">
                <Paperclip className="w-7 h-7" />
                <span className="text-xs font-bold uppercase tracking-widest">Upload Local File</span>
              </button>
              <input type="file" ref={localImageInputRef} className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                   const url = URL.createObjectURL(file);
                   const currentText = contentRef.current + `\n\n![Image](${url})\n\n`;
                   editorRef.current?.action(replaceAll(currentText));
                   contentRef.current = currentText;
                   setShowImagePrompt(false);
                }
              }} />
              <div className="flex gap-2">
                <input autoFocus type="text" value={imgUrlInput} onChange={(e) => setImgUrlInput(e.target.value)} onKeyDown={(e) => {
                   if (e.key === 'Enter' && imgUrlInput.trim()) {
                     const currentText = contentRef.current + `\n\n![Image](${imgUrlInput.trim()})\n\n`;
                     editorRef.current?.action(replaceAll(currentText));
                     contentRef.current = currentText;
                     setImgUrlInput('');
                     setShowImagePrompt(false);
                   }
                }} className="flex-1 px-5 py-4 bg-surface-highlight border border-transparent focus:border-accent rounded-2xl outline-none text-primary transition-all text-xs" placeholder="https://..." />
                <button onClick={() => setShowImagePrompt(false)} className="p-4 bg-accent text-accent-fg rounded-2xl active:scale-90"><Plus className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};