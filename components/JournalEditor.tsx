import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { 
  ArrowLeft, Sparkles, Wand2, RefreshCw, Save, X, 
  Bold, Italic, List, Code, Undo, Redo, 
  ChevronDown, Loader2, Feather, LayoutTemplate, ImageOff, Check, FileText
} from 'lucide-react';
import { Editor, rootCtx, defaultValueCtx, commandsCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history';
import { Milkdown, useEditor, MilkdownProvider } from '@milkdown/react';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { toggleStrongCommand, toggleEmphasisCommand, toggleInlineCodeCommand, wrapInBulletListCommand } from '@milkdown/preset-commonmark';
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

// Curated collections for reliable manual selection
const AESTHETIC_CATEGORIES = {
  MINIMAL: [
    'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1499750310159-5b5f0969206b?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1507643179173-617d699f996a?auto=format&fit=crop&q=80&w=1200',
  ],
  NATURE: [
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1518173946687-a4c88928d9fd?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=1200',
  ],
  ABSTRACT: [
    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1550684847-75bdda21cc95?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&q=80&w=1200',
  ],
  COZY: [
    'https://images.unsplash.com/photo-1517816428104-7975d5d988ff?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1516541196182-6bdb0516ed27?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&q=80&w=1200',
  ]
};

const getRandomCover = () => AESTHETIC_CATEGORIES.MINIMAL[0];

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeout: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

const EditorInstance = memo(({ defaultValue, onMarkdownUpdate, onEditorReady, onStateChange }: { 
  defaultValue: string; 
  onMarkdownUpdate: (markdown: string) => void;
  onEditorReady: (editor: Editor) => void;
  onStateChange: (editor: Editor) => void;
}) => {
  const initialValueRef = useRef(defaultValue);
  // Important: We need a ref for the latest update handler to avoid re-creating the editor
  // when the handler changes, although we are passing a stable handler from parent now.
  
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
  // Dependency array is critical. If any of these change, editor recreates.
  // We rely on parent to pass stable references.

  return <Milkdown />;
});

interface ActiveStates {
  bold: boolean;
  italic: boolean;
  code: boolean;
  bulletList: boolean;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({ 
  isOpen, onClose, onSave, initialContent = '', initialImage, initialId, selectedModel 
}) => {
  // Use lazy initialization to set content once from props
  const [content, setContent] = useState(() => initialContent);
  const [image, setImage] = useState<string>(() => initialImage || getRandomCover());
  
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const [activeStates, setActiveStates] = useState<ActiveStates>({
    bold: false, italic: false, code: false, bulletList: false
  });

  // Re-sync state when opening (in case of component reuse without unmount, though we enforce unmount via key in App)
  useEffect(() => {
    if (isOpen) {
      setContent(initialContent || '');
      setImage(initialImage || getRandomCover());
      setShowAiMenu(false);
      setShowGallery(false);
      setImgLoading(true);
      setImgError(false);
    }
  }, [isOpen, initialContent, initialImage]);

  // STABLE CALLBACKS to prevent editor re-creation
  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  const handleMarkdownUpdate = useCallback((md: string) => {
    setContent(md);
  }, []);

  const updateActiveStates = useCallback((editor: Editor) => {
    // Placeholder for future state updates
  }, []);

  const callCommand = (command: any) => {
    editorRef.current?.action((ctx) => ctx.get(commandsCtx).call(command));
  };

  const handleAiEdit = async (type: 'IMPROVE' | 'REPHRASE' | 'SUMMARIZE') => {
    if (!editorRef.current || !content.trim()) return;
    setIsProcessing(true);
    setShowAiMenu(false);
    try {
      const newText = await editJournalText(content, type, selectedModel);
      if (newText) {
        editorRef.current.action(replaceAll(newText));
        setContent(newText);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateCover = async () => {
    if (!content.trim()) return;
    setIsImageGenerating(true);
    try {
      const newImage = await generateCoverImage(content.slice(0, 500)); 
      if (newImage) setImage(newImage);
    } catch (e) {
      console.error(e);
    } finally {
      setIsImageGenerating(false);
    }
  };

  const handleSave = () => {
    onSave(content, image);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-bg flex flex-col animate-fade-in overflow-hidden">
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
                onClick={() => setShowGallery(!showGallery)}
                className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:gap-2 px-0 md:px-4 py-0 md:py-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all font-grotesk text-[10px] md:text-xs font-bold uppercase tracking-widest"
                title="Change Cover"
             >
                <LayoutTemplate className="w-3.5 h-3.5 md:w-4 h-4" />
                <span className="hidden md:inline">Gallery</span>
             </button>

             <button 
                onClick={handleGenerateCover}
                disabled={isImageGenerating}
                className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:gap-2 px-0 md:px-4 py-0 md:py-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all font-grotesk text-[10px] md:text-xs font-bold uppercase tracking-widest"
                title="AI Remix"
             >
               {isImageGenerating ? <Loader2 className="w-3.5 h-3.5 md:w-4 h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 md:w-4 h-4" />}
               <span className="hidden md:inline">{isImageGenerating ? 'Dreaming...' : 'Remix'}</span>
             </button>

             <button onClick={handleSave} className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 bg-accent text-accent-fg rounded-full hover:bg-accent/90 shadow-lg transition-all active:scale-95 font-grotesk text-[10px] md:text-xs font-bold uppercase tracking-widest">
                <Save className="w-3.5 h-3.5 md:w-4 h-4" />
                <span>Save</span>
             </button>
          </div>
        </div>

        {showGallery && (
          <div className="absolute inset-x-0 top-16 md:top-20 z-20 p-4 animate-slide-up">
            <div className="bg-surface/95 backdrop-blur-xl rounded-2xl border border-surface-highlight shadow-2xl overflow-hidden max-h-[60vh] md:max-h-[500px] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-surface-highlight sticky top-0 bg-surface/95 backdrop-blur-md z-10">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Select Cover</span>
                <button onClick={() => setShowGallery(false)}><X className="w-4 h-4 text-secondary" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-6">
                {Object.entries(AESTHETIC_CATEGORIES).map(([category, urls]) => (
                  <div key={category}>
                    <h4 className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-3 opacity-70">{category}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {urls.map((url, idx) => (
                        <button 
                          key={idx}
                          onClick={() => { setImage(url); setShowGallery(false); }}
                          className={`relative aspect-video rounded-xl overflow-hidden group border-2 transition-all ${image === url ? 'border-accent ring-2 ring-accent/20' : 'border-transparent hover:border-surface-highlight'}`}
                        >
                          <img src={url} alt={`${category} ${idx}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          {image === url && (
                            <div className="absolute inset-0 bg-accent/20 flex items-center justify-center backdrop-blur-[1px]">
                              <Check className="w-6 h-6 text-white drop-shadow-md" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-grow flex flex-col max-w-4xl mx-auto w-full -mt-6 md:-mt-12 z-20 px-3 md:px-6 pb-3 md:pb-6 h-full overflow-hidden">
        <div className="bg-surface/90 backdrop-blur-xl border border-surface-highlight shadow-xl rounded-2xl md:rounded-[1.5rem] p-1.5 md:p-2 flex items-center gap-0.5 md:gap-1 mb-3 md:mb-6 shrink-0 sticky top-0 z-30 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-0.5 md:gap-1 pr-1.5 md:pr-2 border-r border-surface-highlight/50 shrink-0">
            <button onClick={() => callCommand(undoCommand.key)} className="p-2 md:p-2.5 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><Undo className="w-3.5 h-3.5 md:w-4 h-4" /></button>
            <button onClick={() => callCommand(redoCommand.key)} className="p-2 md:p-2.5 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><Redo className="w-3.5 h-3.5 md:w-4 h-4" /></button>
          </div>

          <div className="flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 border-r border-surface-highlight/50 shrink-0">
            <button onClick={() => callCommand(toggleStrongCommand.key)} className="p-2 md:p-2.5 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><Bold className="w-3.5 h-3.5 md:w-4 h-4" /></button>
            <button onClick={() => callCommand(toggleEmphasisCommand.key)} className="p-2 md:p-2.5 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><Italic className="w-3.5 h-3.5 md:w-4 h-4" /></button>
            <button onClick={() => callCommand(toggleInlineCodeCommand.key)} className="p-2 md:p-2.5 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><Code className="w-3.5 h-3.5 md:w-4 h-4" /></button>
            <button onClick={() => callCommand(wrapInBulletListCommand.key)} className="p-2 md:p-2.5 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><List className="w-3.5 h-3.5 md:w-4 h-4" /></button>
          </div>

          <div className="flex-grow min-w-[8px]"></div>

          <div className="relative shrink-0">
            <button 
              onClick={() => !isProcessing && setShowAiMenu(!showAiMenu)}
              disabled={isProcessing}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all border ${showAiMenu ? 'bg-accent/10 border-accent text-accent' : 'bg-surface hover:bg-surface-highlight border-transparent text-secondary hover:text-primary'}`}
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 md:w-4 h-4 animate-spin text-accent" />
              ) : (
                <Sparkles className={`w-3.5 h-3.5 md:w-4 h-4 ${showAiMenu ? 'text-accent' : ''}`} />
              )}
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider hidden xs:inline">Assistant</span>
              <ChevronDown className={`w-3 h-3 md:w-3.5 h-3.5 transition-transform duration-300 ${showAiMenu ? 'rotate-180' : ''}`} />
            </button>

            {showAiMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 md:w-56 bg-surface rounded-2xl border border-surface-highlight shadow-2xl p-1.5 md:p-2 animate-scale-in z-50 flex flex-col gap-1">
                <button onClick={() => handleAiEdit('IMPROVE')} className="flex items-center gap-3 w-full p-2.5 md:p-3 rounded-xl hover:bg-surface-highlight text-left group transition-colors">
                  <div className="p-1.5 md:p-2 bg-emerald-500/10 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                    <Wand2 className="w-3.5 h-3.5 md:w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs md:text-sm font-semibold text-primary">Polish Flow</span>
                    <span className="hidden xs:block text-[9px] md:text-[10px] text-secondary opacity-70">Fix grammar</span>
                  </div>
                </button>
                <button onClick={() => handleAiEdit('REPHRASE')} className="flex items-center gap-3 w-full p-2.5 md:p-3 rounded-xl hover:bg-surface-highlight text-left group transition-colors">
                  <div className="p-1.5 md:p-2 bg-purple-500/10 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                    <Feather className="w-3.5 h-3.5 md:w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs md:text-sm font-semibold text-primary">Poetic Style</span>
                    <span className="hidden xs:block text-[9px] md:text-[10px] text-secondary opacity-70">Elegant rewrite</span>
                  </div>
                </button>
                <button onClick={() => handleAiEdit('SUMMARIZE')} className="flex items-center gap-3 w-full p-2.5 md:p-3 rounded-xl hover:bg-surface-highlight text-left group transition-colors">
                  <div className="p-1.5 md:p-2 bg-amber-500/10 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
                    <FileText className="w-3.5 h-3.5 md:w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs md:text-sm font-semibold text-primary">Summarize</span>
                    <span className="hidden xs:block text-[9px] md:text-[10px] text-secondary opacity-70">Condense info</span>
                  </div>
                </button>
              </div>
            )}
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
        
        <div className="mt-2 md:mt-4 px-2 md:px-4 flex justify-between items-center text-[9px] md:text-[10px] font-mono text-secondary opacity-50 uppercase tracking-widest">
           <span>{content.length} characters</span>
           <span>{selectedModel?.replace('gemini-', '') || 'AI-Ready'}</span>
        </div>
      </div>
    </div>
  );
};