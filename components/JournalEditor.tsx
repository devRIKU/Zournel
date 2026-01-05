import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Sparkles, Wand2, RefreshCw, Save, ImageIcon, X, Plus, 
  Paperclip, CheckCircle, MoreHorizontal, AlignLeft, Bold, Italic, Type 
} from 'lucide-react';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { commonmark } from '@milkdown/preset-commonmark';
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

const EditorContent: React.FC<{ 
  initialValue: string; 
  onChange: (markdown: string) => void;
  contentRef: React.MutableRefObject<string>;
  editorInstanceRef: React.MutableRefObject<Editor | null>;
}> = ({ initialValue, onChange, contentRef, editorInstanceRef }) => {
  
  useEditor((root) => {
    const e = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialValue);
        ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
          contentRef.current = markdown;
          onChange(markdown);
        });
      })
      .config(nord)
      .use(commonmark)
      .use(listener);
    
    editorInstanceRef.current = e;
    return e;
  }, []);

  return <Milkdown />;
};

export const JournalEditor: React.FC<JournalEditorProps> = ({ isOpen, onClose, onSave, initialContent = '', initialImage, selectedModel }) => {
  const [content, setContent] = useState(initialContent);
  const contentRef = useRef(initialContent);
  const editorInstanceRef = useRef<Editor | null>(null);
  
  const [image, setImage] = useState<string>(initialImage || getRandomCover());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [imgUrlInput, setImgUrlInput] = useState('');
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const localImageInputRef = useRef<HTMLInputElement>(null);
  const localCoverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      let targetContent = initialContent;
      let targetImage = initialImage || getRandomCover();

      if (!initialContent && savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          targetContent = draft.content || '';
          targetImage = draft.image || initialImage || getRandomCover();
        } catch (e) {}
      }

      setContent(targetContent);
      contentRef.current = targetContent;
      setImage(targetImage);
      setImageLoaded(false); // Reset loading state for the new image
    }
  }, [isOpen, initialContent, initialImage]);

  useEffect(() => {
    let interval: number;
    if (isOpen) {
      interval = window.setInterval(() => {
        const currentText = contentRef.current;
        if (currentText.trim()) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ content: currentText, image, timestamp: Date.now() }));
          setShowSaveIndicator(true);
          setTimeout(() => setShowSaveIndicator(false), 3000);
        }
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [isOpen, image]);

  const handleManualSave = () => {
    const finalContent = contentRef.current;
    if (finalContent.trim()) {
      onSave(finalContent, image);
      localStorage.removeItem(DRAFT_KEY);
      onClose();
    }
  };

  const updateEditorContent = (newMarkdown: string) => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.action(replaceAll(newMarkdown));
    }
    contentRef.current = newMarkdown;
    setContent(newMarkdown);
  };

  const handleAIEdit = async (type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE') => {
    const currentText = contentRef.current;
    if (!currentText.trim()) return;
    setIsProcessing(true);
    setShowAiMenu(false);
    try {
      const newText = await editJournalText(currentText, type, selectedModel);
      updateEditorContent(newText);
    } catch (e) {} finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateCover = async () => {
    setIsProcessing(true);
    try {
      const currentText = contentRef.current;
      const generated = await generateCoverImage(currentText.slice(0, 150));
      if (generated) {
        setImage(generated);
        setImageLoaded(false);
      }
    } catch (e) {} finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-bg flex flex-col animate-fade-in overflow-hidden" role="dialog" aria-modal="true">
      {/* Header Area - Increased space */}
      <div className="relative h-[45vh] shrink-0 w-full overflow-hidden bg-surface-highlight">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <img 
          src={image} 
          className={`w-full h-full object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} 
          alt="Entry cover" 
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImage(getRandomCover());
            setImageLoaded(false);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-bg"></div>
        
        {/* Navigation Overlays */}
        <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50">
          <button onClick={onClose} className="w-14 h-14 flex items-center justify-center bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-2xl text-white hover:bg-white/30 transition-all focus:ring-2 focus:ring-white/50 outline-none">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button onClick={handleManualSave} className="px-8 py-4 bg-accent text-accent-fg rounded-2xl text-sm font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-white/20 focus:ring-2 focus:ring-accent-fg/50 outline-none">
            <Save className="w-5 h-5" />
            <span>Save Entry</span>
          </button>
        </div>

        {/* Cover Controls */}
        <div className="absolute bottom-12 right-12 flex gap-4 z-50">
          <div className="flex bg-white/10 backdrop-blur-2xl p-2 rounded-2xl border border-white/20 shadow-2xl items-center">
            {AESTHETIC_COLLECTION.slice(0, 3).map((url) => (
              <button key={url} onClick={() => { setImage(url); setImageLoaded(false); }} className={`w-8 h-8 rounded-lg overflow-hidden border-2 m-1 transition-all ${image === url ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                <img src={url} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
            <button onClick={() => localCoverInputRef.current?.click()} className="w-8 h-8 rounded-lg border-2 border-white/20 m-1 flex items-center justify-center text-white hover:bg-white/10 transition-all">
              <Plus className="w-4 h-4" />
            </button>
            <input type="file" ref={localCoverInputRef} className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setImage(URL.createObjectURL(file));
                setImageLoaded(false);
              }
            }} />
          </div>
          <button onClick={handleGenerateCover} disabled={isProcessing} className={`flex items-center gap-2 px-6 py-4 bg-white/20 backdrop-blur-2xl text-white border border-white/20 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/30 transition-all ${isProcessing ? 'animate-pulse' : ''}`}>
            <Sparkles className="w-4 h-4" /> AI Gen
          </button>
        </div>
      </div>

      {/* Main Content & Persistent Toolbar */}
      <div className="flex-1 bg-bg flex flex-col overflow-hidden relative z-20 -mt-10 rounded-t-[3.5rem] shadow-[-10px_-10px_60px_-10px_rgba(0,0,0,0.1)]">
        
        {/* Enhanced Sticky Toolbar */}
        <div className="sticky top-10 flex justify-center z-40 px-4 mt-8">
          <div className="flex items-center gap-2 p-2 bg-surface border border-surface-highlight shadow-2xl rounded-[2.5rem]">
            {/* Formatting Tools */}
            <div className="flex items-center border-r border-surface-highlight pr-2">
               <button className="p-3 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-colors"><Bold className="w-4 h-4"/></button>
               <button className="p-3 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-colors"><Italic className="w-4 h-4"/></button>
               <button onClick={() => setShowImagePrompt(true)} className="p-3 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-colors"><ImageIcon className="w-4 h-4"/></button>
            </div>

            {/* AI Menu - Responsive */}
            <div className="flex items-center relative">
               {/* Desktop AI Tools */}
               <div className="hidden sm:flex items-center gap-1">
                 <button onClick={() => handleAIEdit('IMPROVE')} disabled={isProcessing} className="flex items-center gap-2 px-4 py-3 hover:bg-accent/10 hover:text-accent rounded-xl text-secondary font-bold text-[10px] uppercase tracking-widest transition-all">
                   <Wand2 className="w-4 h-4"/> <span>Refine</span>
                 </button>
                 <button onClick={() => handleAIEdit('REPHRASE')} disabled={isProcessing} className="flex items-center gap-2 px-4 py-3 hover:bg-accent/10 hover:text-accent rounded-xl text-secondary font-bold text-[10px] uppercase tracking-widest transition-all">
                   <RefreshCw className="w-4 h-4"/> <span>Rewrite</span>
                 </button>
                 <button onClick={() => handleAIEdit('SUMMARIZE')} disabled={isProcessing} className="flex items-center gap-2 px-4 py-3 hover:bg-accent/10 hover:text-accent rounded-xl text-secondary font-bold text-[10px] uppercase tracking-widest transition-all">
                   <AlignLeft className="w-4 h-4"/> <span>Summary</span>
                 </button>
               </div>

               {/* Mobile/Compact AI Menu - Fixed to open Downward */}
               <div className="sm:hidden relative">
                 <button onClick={() => setShowAiMenu(!showAiMenu)} className={`p-3 rounded-xl transition-all ${showAiMenu ? 'bg-accent text-accent-fg' : 'text-secondary hover:bg-surface-highlight'}`}>
                   <MoreHorizontal className="w-5 h-5" />
                 </button>
                 
                 {showAiMenu && (
                   <div className="absolute top-full mt-4 right-0 w-48 bg-surface border border-surface-highlight rounded-2xl shadow-2xl p-2 animate-scale-in flex flex-col gap-1 overflow-hidden z-[60]">
                      <button onClick={() => handleAIEdit('IMPROVE')} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/10 text-primary text-xs font-bold uppercase rounded-lg"><Wand2 className="w-4 h-4"/> Refine</button>
                      <button onClick={() => handleAIEdit('REPHRASE')} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/10 text-primary text-xs font-bold uppercase rounded-lg"><RefreshCw className="w-4 h-4"/> Rewrite</button>
                      <button onClick={() => handleAIEdit('SUMMARIZE')} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/10 text-primary text-xs font-bold uppercase rounded-lg"><AlignLeft className="w-4 h-4"/> Summary</button>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>

        {/* Writing Surface */}
        <div className="flex-1 overflow-y-auto no-scrollbar pt-12 px-10">
          <div className="max-w-4xl mx-auto relative min-h-[60vh]">
            <MilkdownProvider>
              <EditorContent 
                initialValue={content} 
                onChange={(val) => contentRef.current = val} 
                contentRef={contentRef}
                editorInstanceRef={editorInstanceRef}
              />
            </MilkdownProvider>
          </div>
        </div>

        {/* Status Area */}
        <div className={`fixed bottom-10 left-10 transition-all duration-500 z-50 ${showSaveIndicator ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="flex items-center gap-2 px-4 py-2 bg-surface/90 backdrop-blur-md rounded-full border border-surface-highlight shadow-xl">
             <CheckCircle className="w-4 h-4 text-emerald-500" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Draft Saved</span>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImagePrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-xl animate-fade-in p-6" role="dialog" aria-modal="true">
          <div className="bg-surface rounded-[3rem] w-full max-w-md p-10 shadow-2xl border border-white/10 animate-scale-in">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-display font-bold text-primary">Add Visual</h3>
              <button onClick={() => setShowImagePrompt(false)} className="p-3 hover:bg-surface-highlight rounded-2xl transition-all"><X className="w-6 h-6"/></button>
            </div>
            <div className="space-y-8">
              <button onClick={() => localImageInputRef.current?.click()} className="w-full py-6 bg-surface-highlight hover:bg-accent hover:text-accent-fg border-2 border-dashed border-surface-highlight rounded-3xl flex flex-col items-center justify-center gap-3 transition-all group">
                <Paperclip className="w-8 h-8 text-secondary group-hover:text-accent-fg" />
                <span className="text-sm font-bold">Pick Image</span>
              </button>
              <input type="file" ref={localImageInputRef} className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                   const url = URL.createObjectURL(file);
                   const currentText = contentRef.current + `\n\n![Image](${url})\n\n`;
                   updateEditorContent(currentText);
                   setShowImagePrompt(false);
                }
              }} />
              <div className="relative flex justify-center items-center"><div className="w-full border-t border-surface-highlight"></div><span className="bg-surface px-4 text-[10px] font-bold uppercase tracking-widest text-secondary absolute">OR URL</span></div>
              <div className="flex gap-3">
                <input autoFocus type="text" value={imgUrlInput} onChange={(e) => setImgUrlInput(e.target.value)} onKeyDown={(e) => {
                   if (e.key === 'Enter' && imgUrlInput.trim()) {
                     const currentText = contentRef.current + `\n\n![Image](${imgUrlInput.trim()})\n\n`;
                     updateEditorContent(currentText);
                     setImgUrlInput('');
                     setShowImagePrompt(false);
                   }
                }} className="flex-1 px-6 py-5 bg-surface-highlight border border-transparent focus:border-accent rounded-3xl outline-none text-primary transition-all text-sm" placeholder="https://..." />
                <button onClick={() => {
                   if (imgUrlInput.trim()) {
                      const currentText = contentRef.current + `\n\n![Image](${imgUrlInput.trim()})\n\n`;
                      updateEditorContent(currentText);
                      setImgUrlInput('');
                      setShowImagePrompt(false);
                   }
                }} className="p-5 bg-accent text-accent-fg rounded-3xl hover:scale-105 transition-all"><Plus className="w-6 h-6" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};