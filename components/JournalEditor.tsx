import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { 
  ArrowLeft, Sparkles, Wand2, RefreshCw, Save, ImageIcon, X, Plus, 
  Paperclip, CheckCircle, Bold, Italic, 
  List, Code, Undo, Redo, BrainCircuit, Type, FileText, Bot, ChevronDown, Loader2, Feather
} from 'lucide-react';
import { Editor, rootCtx, defaultValueCtx, commandsCtx, editorViewCtx } from '@milkdown/core';
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

const AESTHETIC_COLLECTION = [
  'https://images.unsplash.com/photo-1499750310159-5b5f0969206b?auto=format&fit=crop&q=60&w=800',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=60&w=800',
  'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&q=60&w=800',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=60&w=800',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=60&w=800',
];

const getRandomCover = () => AESTHETIC_COLLECTION[Math.floor(Math.random() * AESTHETIC_COLLECTION.length)];

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
  const debouncedUpdate = useMemo(() => debounce(onMarkdownUpdate, 300), [onMarkdownUpdate]);

  useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialValueRef.current);
        const l = ctx.get(listenerCtx);
        l.markdownUpdated((_, markdown) => {
          debouncedUpdate(markdown);
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
  }, [debouncedUpdate, onEditorReady, onStateChange]);

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
  const [image, setImage] = useState<string>(initialImage || getRandomCover());
  const [content, setContent] = useState(initialContent);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const [activeStates, setActiveStates] = useState<ActiveStates>({
    bold: false, italic: false, code: false, bulletList: false
  });

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent || '');
      setImage(initialImage || getRandomCover());
      setShowAiMenu(false);
    }
  }, [isOpen, initialContent, initialImage]);

  const callCommand = (command: any) => {
    editorRef.current?.action((ctx) => ctx.get(commandsCtx).call(command));
  };

  const updateActiveStates = useCallback((editor: Editor) => {
    // Milkdown state checking would go here if needed strictly
    // For simplicity in this demo, we rely on standard toggle behavior
  }, []);

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
      const newImage = await generateCoverImage(content.slice(0, 500)); // Send context
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
      <div className="relative h-64 w-full shrink-0 group">
        <img src={image} alt="Cover" className="w-full h-full object-cover transition-all duration-700" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-bg"></div>
        
        {/* Top Nav */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start text-white z-10">
          <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all active:scale-90">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex gap-3">
             <button 
                onClick={handleGenerateCover}
                disabled={isImageGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all font-grotesk text-xs font-bold uppercase tracking-widest"
             >
               {isImageGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
               <span>{isImageGenerating ? 'Dreaming...' : 'Remix Art'}</span>
             </button>
             <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-accent text-accent-fg rounded-full hover:bg-accent/90 shadow-lg transition-all active:scale-95 font-grotesk text-xs font-bold uppercase tracking-widest">
                <Save className="w-4 h-4" />
                <span>Save Memory</span>
             </button>
          </div>
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-grow flex flex-col max-w-4xl mx-auto w-full -mt-12 z-20 px-6 pb-6 h-full overflow-hidden">
        {/* Toolbar */}
        <div className="bg-surface/80 backdrop-blur-xl border border-surface-highlight shadow-xl rounded-[1.5rem] p-2 flex flex-wrap items-center gap-1 mb-6 shrink-0 sticky top-0">
          <div className="flex items-center gap-1 pr-2 border-r border-surface-highlight/50">
            <button onClick={() => callCommand(undoCommand.key)} className="p-2.5 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><Undo className="w-4 h-4" /></button>
            <button onClick={() => callCommand(redoCommand.key)} className="p-2.5 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><Redo className="w-4 h-4" /></button>
          </div>

          <div className="flex items-center gap-1 px-2 border-r border-surface-highlight/50">
            <button onClick={() => callCommand(toggleStrongCommand.key)} className="p-2.5 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><Bold className="w-4 h-4" /></button>
            <button onClick={() => callCommand(toggleEmphasisCommand.key)} className="p-2.5 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><Italic className="w-4 h-4" /></button>
            <button onClick={() => callCommand(toggleInlineCodeCommand.key)} className="p-2.5 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><Code className="w-4 h-4" /></button>
            <button onClick={() => callCommand(wrapInBulletListCommand.key)} className="p-2.5 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors"><List className="w-4 h-4" /></button>
          </div>

          <div className="flex-grow"></div>

          {/* AI Assistant Dropdown */}
          <div className="relative">
            <button 
              onClick={() => !isProcessing && setShowAiMenu(!showAiMenu)}
              disabled={isProcessing}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border ${showAiMenu ? 'bg-accent/10 border-accent text-accent' : 'bg-surface hover:bg-surface-highlight border-transparent text-secondary hover:text-primary'}`}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
              ) : (
                <Sparkles className={`w-4 h-4 ${showAiMenu ? 'text-accent' : ''}`} />
              )}
              <span className="text-xs font-bold uppercase tracking-wider">Assistant</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showAiMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showAiMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-2xl border border-surface-highlight shadow-2xl p-2 animate-scale-in z-50 flex flex-col gap-1">
                <button 
                  onClick={() => handleAiEdit('IMPROVE')}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-surface-highlight text-left group transition-colors"
                >
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-primary">Polish Flow</span>
                    <span className="block text-[10px] text-secondary opacity-70">Fix grammar & tone</span>
                  </div>
                </button>

                <button 
                  onClick={() => handleAiEdit('REPHRASE')}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-surface-highlight text-left group transition-colors"
                >
                  <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                    <Feather className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-primary">Literary Style</span>
                    <span className="block text-[10px] text-secondary opacity-70">Make it poetic</span>
                  </div>
                </button>

                <button 
                  onClick={() => handleAiEdit('SUMMARIZE')}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-surface-highlight text-left group transition-colors"
                >
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-primary">Summarize</span>
                    <span className="block text-[10px] text-secondary opacity-70">Condense thoughts</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Text Editor */}
        <div className="flex-grow overflow-y-auto no-scrollbar bg-surface rounded-[2rem] p-8 border border-surface-highlight shadow-sm">
          <MilkdownProvider>
            <EditorInstance 
              defaultValue={content} 
              onMarkdownUpdate={(md) => setContent(md)} 
              onEditorReady={(editor) => editorRef.current = editor}
              onStateChange={updateActiveStates}
            />
          </MilkdownProvider>
        </div>
        
        {/* Status Bar */}
        <div className="mt-4 px-4 flex justify-between items-center text-[10px] font-mono text-secondary opacity-50 uppercase tracking-widest">
           <span>{content.length} characters</span>
           <span>{selectedModel?.replace('gemini-', '') || 'AI-Ready'}</span>
        </div>
      </div>
    </div>
  );
};