import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { 
  ArrowLeft, Sparkles, Wand2, Save, X, 
  Bold, Italic, List, ListOrdered, Strikethrough, Code, Undo, Redo, 
  ChevronDown, Loader2, Feather, LayoutTemplate, ImageOff, Check, FileText,
  History, CheckCircle, XCircle, Heading1, Heading2, Quote, Minus,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Editor, rootCtx, defaultValueCtx, commandsCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { 
  commonmark, 
  wrapInHeadingCommand, 
  insertHrCommand, 
  wrapInBlockquoteCommand,
  toggleStrongCommand, 
  toggleEmphasisCommand, 
  toggleInlineCodeCommand, 
  wrapInBulletListCommand, 
  wrapInOrderedListCommand
} from '@milkdown/preset-commonmark';
import { gfm, toggleStrikethroughCommand } from '@milkdown/preset-gfm';
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history';
import { Milkdown, useEditor, MilkdownProvider } from '@milkdown/react';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll } from '@milkdown/utils';
import { editJournalText } from '../services/geminiService';

interface JournalEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string, image: string | undefined, mood?: string) => void;
  initialContent?: string;
  initialImage?: string;
  initialId?: string;
  initialMood?: string;
  selectedModel?: string;
}

const AESTHETIC_CATEGORIES = {
  MINIMAL: [
    'https://picsum.photos/id/343/800/600',
    'https://picsum.photos/id/364/800/600',
    'https://picsum.photos/id/505/800/600',
    'https://picsum.photos/id/684/800/600',
    'https://picsum.photos/id/744/800/600',
    'https://picsum.photos/id/10/800/600',
  ],
  NATURE: [
    'https://picsum.photos/id/29/800/600',
    'https://picsum.photos/id/175/800/600',
    'https://picsum.photos/id/815/800/600',
    'https://picsum.photos/id/1015/800/600',
    'https://picsum.photos/id/1025/800/600',
    'https://picsum.photos/id/1035/800/600',
  ],
  ATMOSPHERE: [
    'https://picsum.photos/id/443/800/600',
    'https://picsum.photos/id/824/800/600',
    'https://picsum.photos/id/1043/800/600',
    'https://picsum.photos/id/1050/800/600',
    'https://picsum.photos/id/1069/800/600',
    'https://picsum.photos/id/1084/800/600',
  ]
};

const getRandomCover = () => {
  const all = [...AESTHETIC_CATEGORIES.MINIMAL, ...AESTHETIC_CATEGORIES.NATURE, ...AESTHETIC_CATEGORIES.ATMOSPHERE];
  return all[Math.floor(Math.random() * all.length)];
};

const EditorInstance = memo(({ defaultValue, onMarkdownUpdate, onEditorReady, onStateChange }: { 
  defaultValue: string; 
  onMarkdownUpdate: (markdown: string) => void;
  onEditorReady: (editor: Editor) => void;
  onStateChange: (editor: Editor) => void;
}) => {
  const initialValueRef = useRef(defaultValue);
  
  useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialValueRef.current);
        const l = ctx.get(listenerCtx);
        l.markdownUpdated((_, markdown) => {
          onMarkdownUpdate(markdown);
          onStateChange(editor);
        });
        l.updated((_) => {
           onStateChange(editor);
        });
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener);
    
    onEditorReady(editor);
    return editor;
  }, [onMarkdownUpdate, onEditorReady, onStateChange]); 

  return <Milkdown />;
});

export const JournalEditor: React.FC<JournalEditorProps> = ({ 
  isOpen, onClose, onSave, initialContent = '', initialImage, initialId, initialMood, selectedModel 
}) => {
  const [content, setContent] = useState(() => initialContent);
  const [image, setImage] = useState<string>(() => initialImage || getRandomCover());
  const [mood, setMood] = useState<string | undefined>(() => initialMood);
  const [showMoodMenu, setShowMoodMenu] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showToolbarMore, setShowToolbarMore] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent || '');
      setImage(initialImage || getRandomCover());
      setMood(initialMood);
      setShowMoodMenu(false);
      setShowAiMenu(false);
      setShowGallery(false);
      setShowToolbarMore(false);
      setPreviewText(null);
      setImgLoading(true);
      setImgError(false);
    }
  }, [isOpen, initialContent, initialImage, initialMood]);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  const handleMarkdownUpdate = useCallback((md: string) => {
    setContent(md);
  }, []);

  const updateActiveStates = useCallback((editor: Editor) => {
  }, []);

  const callCommand = (command: any, payload?: any) => {
    editorRef.current?.action((ctx) => ctx.get(commandsCtx).call(command, payload));
    // Close mobile menu after selection if open
    if (showToolbarMore) setShowToolbarMore(false);
  };

  const handleAiAction = async (type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE') => {
    if (!editorRef.current || !content.trim()) return;
    setIsProcessing(true);
    setShowAiMenu(false);
    try {
      const result = await editJournalText(content, type, selectedModel);
      if (result && result !== content) {
        setPreviewText(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyAiPreview = () => {
    if (previewText && editorRef.current) {
      editorRef.current.action(replaceAll(previewText));
      setContent(previewText);
      setPreviewText(null);
    }
  };

  const discardAiPreview = () => {
    setPreviewText(null);
  };

  const handleSave = () => {
    onSave(content, image, mood);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 35, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 35, scale: 0.99 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="fixed inset-0 z-[100] bg-bg flex flex-col overflow-hidden"
        >
          {/* Cover Image Header */}
          <div className="relative h-48 md:h-64 w-full shrink-0 group bg-surface-highlight overflow-hidden">
        {imgLoading && (
          <div className="absolute inset-0 bg-surface-highlight animate-pulse flex items-center justify-center z-0">
             <Loader2 className="w-8 h-8 text-accent animate-spin opacity-50" />
          </div>
        )}
        {imgError && (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-surface-highlight flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-secondary/50">
              <ImageOff className="w-8 h-8" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Image unavailable</span>
            </div>
          </div>
        )}

        <img 
          src={image} 
          alt="Cover" 
          onLoad={() => setImgLoading(false)}
          onError={() => { setImgError(true); setImgLoading(false); }}
          className={`w-full h-full object-cover transition-all duration-700 ${imgLoading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`} 
        />
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-bg"></div>
        
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-start text-white z-10">
          <button onClick={onClose} className="p-2.5 md:p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all active:scale-90">
            <ArrowLeft className="w-5 h-5 md:w-6 h-6" />
          </button>
          
          <div className="flex gap-2 md:gap-3">
             <button 
                onClick={() => setShowGallery(true)}
                className="flex items-center gap-2 px-4 md:px-6 py-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all font-grotesk text-[10px] md:text-xs font-bold uppercase tracking-widest"
                title="Change Cover"
             >
                <LayoutTemplate className="w-3.5 h-3.5 md:w-4 h-4" />
                <span>Gallery</span>
             </button>

             <button onClick={handleSave} className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 bg-accent text-accent-fg rounded-full hover:bg-accent/90 shadow-lg transition-all active:scale-95 font-grotesk text-[10px] md:text-xs font-bold uppercase tracking-widest">
                <Save className="w-3.5 h-3.5 md:w-4 h-4" />
                <span>Save</span>
             </button>
          </div>
        </div>

        {/* Gallery Modal */}
        <AnimatePresence>
          {showGallery && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                className="bg-surface rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden border border-white/10"
              >
                <div className="flex justify-between items-center p-6 md:p-8 border-b border-surface-highlight sticky top-0 bg-surface z-10">
                  <div>
                     <h2 className="text-2xl font-display font-bold text-primary">Aesthetic Gallery</h2>
                     <p className="text-secondary text-[9px] font-bold uppercase tracking-widest mt-1 opacity-60">Verified high-quality collection</p>
                  </div>
                  <button onClick={() => setShowGallery(false)} className="p-3 hover:bg-surface-highlight rounded-xl transition-colors">
                    <X className="w-5 h-5 text-secondary" />
                  </button>
                </div>
                <div className="overflow-y-auto p-6 md:p-8 space-y-12 no-scrollbar">
                  {Object.entries(AESTHETIC_CATEGORIES).map(([category, urls]) => (
                    <div key={category}>
                      <h4 className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-4 pl-1 border-l-2 border-accent/20">{category}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {urls.map((url, idx) => (
                          <button 
                            key={idx}
                            onClick={() => { setImage(url); setShowGallery(false); }}
                            className={`relative aspect-video rounded-2xl overflow-hidden group border-2 transition-all ${image === url ? 'border-accent ring-4 ring-accent/10 scale-95' : 'border-transparent hover:border-surface-highlight hover:scale-[1.02]'}`}
                          >
                            <img 
                              src={url} 
                              alt={`${category} ${idx}`} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                              loading="lazy"
                            />
                            {image === url && (
                              <div className="absolute inset-0 bg-accent/20 flex items-center justify-center backdrop-blur-[1px]">
                                <Check className="w-8 h-8 text-white drop-shadow-md" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Preview Modal */}
      <AnimatePresence>
        {previewText && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="bg-surface rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-accent/20"
            >
              <div className="p-8 border-b border-surface-highlight flex justify-between items-center bg-accent/5">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent rounded-2xl">
                      <Sparkles className="w-6 h-6 text-accent-fg" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold text-primary">Preview AI Changes</h3>
                      <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1">Review the suggested rewrite below</p>
                    </div>
                 </div>
                 <button onClick={discardAiPreview} className="p-2 hover:bg-surface-highlight rounded-xl"><X className="w-5 h-5 text-secondary" /></button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-8 bg-surface">
                 <div className="flex gap-6">
                    <div className="flex-1 space-y-4">
                       <span className="text-[9px] font-bold uppercase tracking-widest text-secondary/50 flex items-center gap-2"><History className="w-3 h-3" /> Current</span>
                       <div className="p-6 bg-surface-highlight rounded-2xl text-primary text-sm leading-relaxed line-clamp-[12] font-medium italic border border-secondary/20 bg-surface/30 shadow-inner">
                          {content || "(Empty)" }
                       </div>
                    </div>
                    <div className="flex-1 space-y-4">
                       <span className="text-[9px] font-bold uppercase tracking-widest text-accent flex items-center gap-2"><Sparkles className="w-3 h-3" /> AI Suggestion</span>
                       <div className="p-6 bg-accent/15 border-2 border-accent/45 rounded-2xl text-primary text-sm leading-relaxed font-semibold shadow-inner">
                          {previewText}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-8 border-t border-surface-highlight flex gap-4 bg-surface-highlight/10">
                 <button 
                    onClick={discardAiPreview}
                    className="flex-1 py-4 px-6 rounded-2xl border border-surface-highlight text-secondary font-bold text-xs uppercase tracking-widest hover:bg-surface-highlight transition-all active:scale-95 flex items-center justify-center gap-2"
                 >
                    <XCircle className="w-4 h-4" />
                    Discard
                 </button>
                 <button 
                    onClick={applyAiPreview}
                    className="flex-[2] py-4 px-6 rounded-2xl bg-accent text-accent-fg font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all active:scale-95 flex items-center justify-center gap-2"
                 >
                    <CheckCircle className="w-4 h-4" />
                    Apply Changes
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-grow flex flex-col max-w-4xl mx-auto w-full -mt-6 md:-mt-12 z-20 px-3 md:px-6 pb-3 md:pb-6 h-full overflow-hidden">
        {/* Optimized Compact Toolbar */}
        <div className="bg-surface/90 backdrop-blur-xl border border-surface-highlight shadow-xl rounded-2xl md:rounded-[1.5rem] p-1 flex items-center mb-2 md:mb-4 shrink-0 relative z-40">
          
          <div className="flex-1 flex items-center pr-2">
            <div className="flex items-center gap-0.5 pr-2 border-r border-surface-highlight/50 mr-1 md:mr-2 shrink-0">
              <button onClick={() => callCommand(undoCommand.key)} className="p-1.5 md:p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><Undo className="w-3.5 h-3.5 md:w-4 h-4" /></button>
              <button onClick={() => callCommand(redoCommand.key)} className="p-1.5 md:p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><Redo className="w-3.5 h-3.5 md:w-4 h-4" /></button>
            </div>

            {/* Primary Tools - Always Visible */}
            <div className="flex items-center gap-0.5 px-1 shrink-0">
              <button onClick={() => callCommand(wrapInHeadingCommand.key, 1)} className="p-1.5 md:p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Heading 1"><Heading1 className="w-3.5 h-3.5 md:w-4 h-4" /></button>
              <button onClick={() => callCommand(wrapInHeadingCommand.key, 2)} className="p-1.5 md:p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Heading 2"><Heading2 className="w-3.5 h-3.5 md:w-4 h-4" /></button>
              
              <div className="w-px h-4 bg-surface-highlight/50 mx-1"></div>
              
              <button onClick={() => callCommand(toggleStrongCommand.key)} className="p-1.5 md:p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Bold"><Bold className="w-3.5 h-3.5 md:w-4 h-4" /></button>
              <button onClick={() => callCommand(toggleEmphasisCommand.key)} className="p-1.5 md:p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Italic"><Italic className="w-3.5 h-3.5 md:w-4 h-4" /></button>
            </div>

            {/* Secondary Tools - Desktop Only */}
            <div className="hidden md:flex items-center gap-0.5 px-1 shrink-0">
              <button onClick={() => callCommand(toggleStrikethroughCommand.key)} className="p-1.5 md:p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5 md:w-4 h-4" /></button>
              <button onClick={() => callCommand(toggleInlineCodeCommand.key)} className="p-1.5 md:p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Code"><Code className="w-3.5 h-3.5 md:w-4 h-4" /></button>
              
              <div className="w-px h-4 bg-surface-highlight/50 mx-1"></div>
              
              <button onClick={() => callCommand(wrapInBulletListCommand.key)} className="p-1.5 md:p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Bullet List"><List className="w-3.5 h-3.5 md:w-4 h-4" /></button>
              <button onClick={() => callCommand(wrapInOrderedListCommand.key)} className="p-1.5 md:p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Ordered List"><ListOrdered className="w-3.5 h-3.5 md:w-4 h-4" /></button>
              <button onClick={() => callCommand(wrapInBlockquoteCommand.key)} className="p-1.5 md:p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Quote"><Quote className="w-3.5 h-3.5 md:w-4 h-4" /></button>
              <button onClick={() => callCommand(insertHrCommand.key)} className="p-1.5 md:p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Divider"><Minus className="w-3.5 h-3.5 md:w-4 h-4" /></button>
            </div>

             {/* Mobile More Button */}
             <div className="md:hidden ml-1 relative">
                <button 
                    onClick={() => setShowToolbarMore(!showToolbarMore)}
                    className={`p-1.5 rounded-xl transition-colors ${showToolbarMore ? 'bg-accent text-accent-fg' : 'text-secondary hover:bg-surface-highlight'}`}
                >
                    <MoreHorizontal className="w-4 h-4" />
                </button>
                
                {showToolbarMore && (
                    <div className="absolute top-full left-0 mt-2 p-1.5 bg-surface border border-surface-highlight shadow-xl rounded-xl flex flex-wrap gap-1 min-w-[180px] z-50 animate-scale-in origin-top-left">
                         <button onClick={() => callCommand(toggleStrikethroughCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-lg transition-colors" title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
                        <button onClick={() => callCommand(toggleInlineCodeCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-lg transition-colors" title="Code"><Code className="w-4 h-4" /></button>
                        <div className="w-full h-px bg-surface-highlight/50 my-1"></div>
                        <button onClick={() => callCommand(wrapInBulletListCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-lg transition-colors" title="Bullet List"><List className="w-4 h-4" /></button>
                        <button onClick={() => callCommand(wrapInOrderedListCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-lg transition-colors" title="Ordered List"><ListOrdered className="w-4 h-4" /></button>
                        <button onClick={() => callCommand(wrapInBlockquoteCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-lg transition-colors" title="Quote"><Quote className="w-4 h-4" /></button>
                        <button onClick={() => callCommand(insertHrCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-lg transition-colors" title="Divider"><Minus className="w-4 h-4" /></button>
                    </div>
                )}
            </div>
          </div>

          {/* Mood Selector Button & Dropdown */}
          <div className="relative shrink-0 pl-1 border-l border-surface-highlight/50 ml-1">
            <button 
              onClick={() => setShowMoodMenu(!showMoodMenu)}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-xl transition-all border ${showMoodMenu ? 'bg-accent/10 border-accent text-accent' : 'bg-surface hover:bg-surface-highlight border-transparent text-secondary hover:text-primary'}`}
              title="Add current emotional state/mood"
            >
              <span className="text-sm md:text-base leading-none select-none">{mood ? mood.split(' ')[0] : '😊'}</span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider hidden sm:inline select-none">
                {mood ? mood.split(' ')[1] : 'Mood'}
              </span>
              <ChevronDown className={`w-3 h-3 md:w-3.5 h-3.5 transition-transform duration-300 ${showMoodMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showMoodMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                  className="absolute right-0 top-full mt-2 w-48 md:w-56 bg-surface rounded-2xl border border-surface-highlight shadow-2xl p-1 md:p-1.5 z-50 flex flex-col gap-0.5"
                >
                  {[
                    { emoji: '😊', label: 'Happy' },
                    { emoji: '😌', label: 'Calm' },
                    { emoji: '⚡', label: 'Energetic' },
                    { emoji: '😢', label: 'Reflective' },
                    { emoji: '🤯', label: 'Stressed' },
                    { emoji: '😠', label: 'Tense' }
                  ].map((item) => {
                    const itemString = `${item.emoji} ${item.label}`;
                    const isSelected = mood === itemString;
                    return (
                      <button 
                        key={item.label}
                        onClick={() => {
                          setMood(itemString);
                          setShowMoodMenu(false);
                        }} 
                        className={`flex items-center gap-3 w-full p-2 rounded-xl text-left group transition-colors ${isSelected ? 'bg-accent/15 font-semibold text-accent' : 'hover:bg-surface-highlight'}`}
                      >
                        <span className="text-lg md:text-xl group-hover:scale-125 transition-transform">{item.emoji}</span>
                        <span className={`text-xs font-semibold ${isSelected ? 'text-accent' : 'text-primary'}`}>{item.label}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-accent ml-auto shrink-0" />
                        )}
                      </button>
                    );
                  })}
                  {mood && (
                    <>
                      <div className="h-px bg-surface-highlight/50 my-1"></div>
                      <button 
                        onClick={() => {
                          setMood(undefined);
                          setShowMoodMenu(false);
                        }}
                        className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl hover:bg-red-500/10 text-red-600 text-xs font-semibold transition-colors"
                      >
                        Clear Mood
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Assistant Button */}
          <div className="relative shrink-0 pl-1 border-l border-surface-highlight/50 ml-1">
            <button 
              onClick={() => !isProcessing && setShowAiMenu(!showAiMenu)}
              disabled={isProcessing}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-xl transition-all border ${showAiMenu ? 'bg-accent/10 border-accent text-accent' : 'bg-surface hover:bg-surface-highlight border-transparent text-secondary hover:text-primary'}`}
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 md:w-4 h-4 animate-spin text-accent" />
              ) : (
                <Sparkles className={`w-3.5 h-3.5 md:w-4 h-4 ${showAiMenu ? 'text-accent' : ''}`} />
              )}
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider hidden sm:inline">Assistant</span>
              <ChevronDown className={`w-3 h-3 md:w-3.5 h-3.5 transition-transform duration-300 ${showAiMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showAiMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                  className="absolute right-0 top-full mt-2 w-48 md:w-56 bg-surface rounded-2xl border border-surface-highlight shadow-2xl p-1 md:p-1.5 z-50 flex flex-col gap-0.5"
                >
                  <button onClick={() => handleAiAction('IMPROVE')} className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-surface-highlight text-left group transition-colors">
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                      <Wand2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-primary">Polish Flow</span>
                    </div>
                  </button>
                  <button onClick={() => handleAiAction('REPHRASE')} className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-surface-highlight text-left group transition-colors">
                    <div className="p-1.5 bg-purple-500/10 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                      <Feather className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-primary">Poetic Style</span>
                    </div>
                  </button>
                  <button onClick={() => handleAiAction('SUMMARIZE')} className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-surface-highlight text-left group transition-colors">
                    <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-primary">Summarize</span>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto no-scrollbar bg-surface rounded-2xl md:rounded-[2rem] p-4 md:p-8 border border-surface-highlight shadow-sm">
          <MilkdownProvider>
            <EditorInstance 
              defaultValue={initialContent || ''} 
              onMarkdownUpdate={handleMarkdownUpdate} 
              onEditorReady={handleEditorReady}
              onStateChange={updateActiveStates}
            />
          </MilkdownProvider>
        </div>
        
        <div className="mt-1 md:mt-2 px-2 md:px-4 flex justify-between items-center text-[9px] font-mono text-secondary opacity-40 uppercase tracking-widest">
           <span>{content.length} characters</span>
           <span>{selectedModel?.replace('gemini-', '') || 'AI-Ready'}</span>
        </div>
      </div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};