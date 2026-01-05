import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { 
  ArrowLeft, Sparkles, Wand2, RefreshCw, Save, ImageIcon, X, Plus, 
  Paperclip, CheckCircle, MoreHorizontal, AlignLeft, Bold, Italic, 
  Strikethrough, List, ListOrdered, Quote, Code
} from 'lucide-react';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { 
  commonmark, 
  toggleStrongCommand, 
  toggleEmphasisCommand, 
  wrapInBulletListCommand, 
  wrapInOrderedListCommand, 
  wrapInBlockquoteCommand,
  toggleCodeCommand
} from '@milkdown/preset-commonmark';
import { gfm, toggleStrikethroughCommand } from '@milkdown/preset-gfm';
import { Milkdown, useEditor, MilkdownProvider } from '@milkdown/react';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll, callCommand } from '@milkdown/utils';
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

const EditorInstance = memo(({ initialValue, onChange, editorRef }: { 
  initialValue: string; 
  onChange: (markdown: string) => void;
  editorRef: React.MutableRefObject<Editor | null>;
}) => {
  useEditor((root) => {
    const e = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialValue);
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          onChange(markdown);
        });
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(listener);
    
    editorRef.current = e;
    return e;
  }, [initialValue]);

  return <Milkdown />;
});

export const JournalEditor: React.FC<JournalEditorProps> = ({ 
  isOpen, onClose, onSave, initialContent = '', initialImage, selectedModel 
}) => {
  const [image, setImage] = useState<string>(initialImage || getRandomCover());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [imgUrlInput, setImgUrlInput] = useState('');
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const contentRef = useRef(initialContent);
  const editorInstanceRef = useRef<Editor | null>(null);
  const localImageInputRef = useRef<HTMLInputElement>(null);
  const localCoverInputRef = useRef<HTMLInputElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  // Close AI menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(event.target as Node)) {
        setShowAiMenu(false);
      }
    };
    if (showAiMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAiMenu]);

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

      contentRef.current = targetContent;
      setImage(targetImage);
      setImageLoaded(false);
      if (editorInstanceRef.current) {
        editorInstanceRef.current.action(replaceAll(targetContent));
      }
    }
  }, [isOpen, initialContent, initialImage]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const currentText = contentRef.current;
      if (currentText.trim() && currentText !== initialContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ content: currentText, image, timestamp: Date.now() }));
        setShowSaveIndicator(true);
        const timer = setTimeout(() => setShowSaveIndicator(false), 2000);
        return () => clearTimeout(timer);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isOpen, image, initialContent]);

  const handleManualSave = useCallback(() => {
    const finalContent = contentRef.current;
    if (finalContent.trim()) {
      onSave(finalContent, image);
      localStorage.removeItem(DRAFT_KEY);
      onClose();
    }
  }, [image, onSave, onClose]);

  const execCommand = useCallback((command: any) => {
    editorInstanceRef.current?.action(callCommand(command));
  }, []);

  const handleAIEdit = async (type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE') => {
    const currentText = contentRef.current;
    if (!currentText.trim()) return;
    setIsProcessing(true);
    setShowAiMenu(false);
    try {
      const newText = await editJournalText(currentText, type, selectedModel);
      editorInstanceRef.current?.action(replaceAll(newText));
      contentRef.current = newText;
    } catch (e) {} finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateCover = async () => {
    setIsProcessing(true);
    try {
      const generated = await generateCoverImage(contentRef.current.slice(0, 150));
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
          onError={() => setImage(getRandomCover())}
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
            <span className="hidden sm:inline text-[10px] sm:text-sm uppercase tracking-widest sm:normal-case sm:tracking-normal">Save</span>
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
              if (file) {
                setImage(URL.createObjectURL(file));
                setImageLoaded(false);
              }
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
        
        {/* Responsive Toolbar */}
        <div className="sticky top-6 flex justify-center z-40 px-4 mt-6">
          <div className="flex items-center justify-center gap-1 p-1.5 bg-surface border border-surface-highlight shadow-xl rounded-full sm:rounded-3xl max-w-full">
            
            {/* Formatting Group */}
            <div className="flex items-center border-r border-surface-highlight pr-1">
               <button onClick={() => execCommand(toggleStrongCommand)} className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-all active:scale-90" title="Bold"><Bold className="w-4 h-4"/></button>
               <button onClick={() => execCommand(toggleEmphasisCommand)} className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-all active:scale-90" title="Italic"><Italic className="w-4 h-4"/></button>
               <button onClick={() => execCommand(toggleStrikethroughCommand)} className="hidden sm:block p-2.5 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-all active:scale-90" title="Strikethrough"><Strikethrough className="w-4 h-4"/></button>
            </div>

            {/* Structure Group */}
            <div className="flex items-center border-r border-surface-highlight pr-1">
               <button onClick={() => execCommand(wrapInBulletListCommand)} className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-all active:scale-90" title="Bullets"><List className="w-4 h-4"/></button>
               <button onClick={() => execCommand(wrapInOrderedListCommand)} className="hidden sm:block p-2.5 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-all active:scale-90" title="Numbers"><ListOrdered className="w-4 h-4"/></button>
               <button onClick={() => execCommand(wrapInBlockquoteCommand)} className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-all active:scale-90" title="Quote"><Quote className="w-4 h-4"/></button>
               <button onClick={() => execCommand(toggleCodeCommand)} className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-all active:scale-90" title="Code"><Code className="w-4 h-4"/></button>
               <button onClick={() => setShowImagePrompt(true)} className="p-2 sm:p-2.5 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary transition-all active:scale-90" title="Image"><ImageIcon className="w-4 h-4"/></button>
            </div>

            {/* AI Actions - Collapsed for better Mobile UX */}
            <div className="flex items-center relative pl-1" ref={aiMenuRef}>
               {/* Desktop: Show full buttons */}
               <div className="hidden md:flex items-center">
                 <button onClick={() => handleAIEdit('IMPROVE')} disabled={isProcessing} className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/10 hover:text-accent rounded-xl text-secondary font-bold text-[9px] uppercase tracking-widest transition-all">
                   <Wand2 className="w-3.5 h-3.5"/> Refine
                 </button>
                 <button onClick={() => handleAIEdit('REPHRASE')} disabled={isProcessing} className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/10 hover:text-accent rounded-xl text-secondary font-bold text-[9px] uppercase tracking-widest transition-all">
                   <RefreshCw className="w-3.5 h-3.5"/> Rewrite
                 </button>
                 <button onClick={() => handleAIEdit('SUMMARIZE')} disabled={isProcessing} className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/10 hover:text-accent rounded-xl text-secondary font-bold text-[9px] uppercase tracking-widest transition-all">
                   <AlignLeft className="w-3.5 h-3.5"/> Sum
                 </button>
               </div>

               {/* Mobile/Tablet: Collapsed into '...' menu that opens DOWNWARD */}
               <div className="md:hidden relative">
                 <button 
                  onClick={() => setShowAiMenu(!showAiMenu)} 
                  className={`p-2.5 rounded-xl transition-all ${showAiMenu ? 'bg-accent text-accent-fg' : 'text-secondary hover:bg-surface-highlight'}`}
                 >
                   <MoreHorizontal className="w-5 h-5" />
                 </button>
                 
                 {showAiMenu && (
                   <div className="absolute top-full mt-3 right-0 w-48 bg-surface border border-surface-highlight rounded-2xl shadow-2xl p-2 animate-scale-in flex flex-col gap-1 z-[60]">
                      <div className="px-4 py-2 mb-1 border-b border-surface-highlight">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                           <Sparkles className="w-3 h-3" /> AI Assistant
                         </span>
                      </div>
                      <button onClick={() => handleAIEdit('IMPROVE')} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/10 text-primary text-xs font-bold uppercase tracking-wider rounded-xl transition-all">
                        <Wand2 className="w-4 h-4 text-accent"/> Refine Entry
                      </button>
                      <button onClick={() => handleAIEdit('REPHRASE')} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/10 text-primary text-xs font-bold uppercase tracking-wider rounded-xl transition-all">
                        <RefreshCw className="w-4 h-4 text-accent"/> Rewrite Draft
                      </button>
                      <button onClick={() => handleAIEdit('SUMMARIZE')} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/10 text-primary text-xs font-bold uppercase tracking-wider rounded-xl transition-all">
                        <AlignLeft className="w-4 h-4 text-accent"/> Summarize
                      </button>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pt-10 px-6 sm:px-10 pb-32">
          <div className="max-w-4xl mx-auto relative min-h-[50vh]">
            <MilkdownProvider>
              <EditorInstance 
                initialValue={initialContent} 
                onChange={(val) => { contentRef.current = val; }}
                editorRef={editorInstanceRef}
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-6" role="dialog" aria-modal="true">
          <div className="bg-surface rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-white/5 animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-display font-bold text-primary">Add Visual</h3>
              <button onClick={() => setShowImagePrompt(false)} className="p-2 hover:bg-surface-highlight rounded-xl transition-all active:scale-90"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-6">
              <button onClick={() => localImageInputRef.current?.click()} className="w-full py-8 bg-surface-highlight hover:bg-accent hover:text-accent-fg border-2 border-dashed border-accent/20 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all group">
                <Paperclip className="w-7 h-7 text-secondary group-hover:text-accent-fg" />
                <span className="text-xs font-bold uppercase tracking-widest">Upload Local File</span>
              </button>
              <input type="file" ref={localImageInputRef} className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                   const url = URL.createObjectURL(file);
                   const currentText = contentRef.current + `\n\n![Image](${url})\n\n`;
                   editorInstanceRef.current?.action(replaceAll(currentText));
                   contentRef.current = currentText;
                   setShowImagePrompt(false);
                }
              }} />
              <div className="relative flex justify-center items-center py-2"><div className="w-full border-t border-surface-highlight"></div><span className="bg-surface px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-secondary absolute">OR USE URL</span></div>
              <div className="flex gap-2">
                <input autoFocus type="text" value={imgUrlInput} onChange={(e) => setImgUrlInput(e.target.value)} onKeyDown={(e) => {
                   if (e.key === 'Enter' && imgUrlInput.trim()) {
                     const currentText = contentRef.current + `\n\n![Image](${imgUrlInput.trim()})\n\n`;
                     editorInstanceRef.current?.action(replaceAll(currentText));
                     contentRef.current = currentText;
                     setImgUrlInput('');
                     setShowImagePrompt(false);
                   }
                }} className="flex-1 px-5 py-4 bg-surface-highlight border border-transparent focus:border-accent rounded-2xl outline-none text-primary transition-all text-xs" placeholder="https://..." />
                <button onClick={() => {
                   if (imgUrlInput.trim()) {
                      const currentText = contentRef.current + `\n\n![Image](${imgUrlInput.trim()})\n\n`;
                      editorInstanceRef.current?.action(replaceAll(currentText));
                      contentRef.current = currentText;
                      setImgUrlInput('');
                      setShowImagePrompt(false);
                   }
                }} className="p-4 bg-accent text-accent-fg rounded-2xl hover:bg-accent/90 transition-all active:scale-90"><Plus className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};