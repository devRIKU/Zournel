import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { 
  ArrowLeft, Sparkles, Wand2, RefreshCw, Save, ImageIcon, X, Plus, 
  Paperclip, CheckCircle, Bold, Italic, 
  List, Code, Undo, Redo, BrainCircuit, Type, FileText
} from 'lucide-react';
import { Editor, rootCtx, defaultValueCtx, commandsCtx, editorViewCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { Milkdown, useEditor, MilkdownProvider } from '@milkdown/react';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll } from '@milkdown/utils';
import { editJournalText } from '../services/geminiService';

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
const AUTO_SAVE_KEY = 'journal_draft_auto_save';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [imgUrlInput, setImgUrlInput] = useState('');
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [activeStates, setActiveStates] = useState<ActiveStates>({
    bold: false, italic: false, code: false, bulletList: false
  });
  
  const contentRef = useRef(initialContent);
  const editorRef = useRef<Editor | null>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const localImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const draft = localStorage.getItem(AUTO_SAVE_KEY);
      if (draft && !initialId) {
        contentRef.current = draft;
      } else {
        contentRef.current = initialContent;
      }
      setImage(initialImage || getRandomCover());
      setImageLoaded(false);
      setWordCount(contentRef.current.trim().split(/\s+/).filter(Boolean).length);
    }
  }, [isOpen, initialContent, initialImage, initialId]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      if (contentRef.current.trim()) {
        localStorage.setItem(AUTO_SAVE_KEY, contentRef.current);
        setShowSaveIndicator(true);
        setTimeout(() => setShowSaveIndicator(false), 3000);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

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

  const handleManualSave = useCallback(() => {
    onSave(contentRef.current, image);
    localStorage.removeItem(AUTO_SAVE_KEY);
    onClose();
  }, [image, onSave, onClose]);

  const handleContentUpdate = useCallback((val: string) => {
    contentRef.current = val;
    setWordCount(val.trim().split(/\s+/).filter(Boolean).length);
  }, []);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  const handleStateChange = useCallback((editor: Editor) => {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      if (!view) return;
      const { state } = view;
      const { selection, schema } = state;
      const isMarkActive = (type: any) => {
        if (!type) return false;
        return state.doc.rangeHasMark(selection.from, selection.to, type);
      };
      const isNodeActive = (type: any) => {
        if (!type) return false;
        let active = false;
        state.doc.nodesBetween(selection.from, selection.to, (node) => {
          if (node.type === type) active = true;
        });
        return active;
      };
      setActiveStates({
        bold: isMarkActive(schema.marks.strong),
        italic: isMarkActive(schema.marks.emphasis),
        code: isMarkActive(schema.marks.code_inline),
        bulletList: isNodeActive(schema.nodes.bullet_list)
      });
    });
  }, []);

  const execCommand = useCallback((commandId: string, payload?: any) => {
    if (editorRef.current) {
      editorRef.current.action((ctx) => {
        const commandManager = ctx.get(commandsCtx);
        try {
          commandManager.call(commandId, payload);
        } catch (e) {
          console.warn("Command failed:", commandId, e);
        }
      });
      handleStateChange(editorRef.current);
    }
  }, [handleStateChange]);

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

  const handleExtractTasks = useCallback(() => {
    if (!contentRef.current.trim()) return;
    setIsProcessing(true);
    setShowAiMenu(false);
    handleManualSave(); // Triggers the task extraction logic in App.tsx
  }, [handleManualSave]);

  const toolbarBtnClass = (active: boolean = false) => `
    p-2.5 rounded-xl transition-all duration-200 active:scale-90 flex items-center justify-center
    ${active ? 'bg-accent text-accent-fg shadow-sm' : 'text-secondary hover:bg-surface-highlight hover:text-primary'}
  `;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-bg flex flex-col animate-fade-in overflow-hidden" role="dialog" aria-modal="true">
      <div className="relative h-[22vh] sm:h-[28vh] shrink-0 w-full overflow-hidden bg-surface-highlight">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-highlight">
            <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          </div>
        )}
        <img 
          src={image} 
          className={`w-full h-full object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} 
          alt="Entry cover" 
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-bg"></div>
        
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-xl text-white hover:bg-white/30 transition-all active:scale-90 outline-none">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className={`transition-all duration-700 flex items-center gap-2 px-4 py-2 bg-emerald-500/10 backdrop-blur-md rounded-full border border-emerald-500/30 ${showSaveIndicator ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Draft Auto-Saved</span>
            </div>
            <button onClick={handleManualSave} className="px-6 py-2.5 bg-accent text-accent-fg rounded-xl text-xs font-bold shadow-xl hover:bg-accent/90 active:scale-95 transition-all flex items-center gap-2 border border-white/10 outline-none">
              <Save className="w-4 h-4" /> <span>Save</span>
            </button>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 flex items-center gap-2 z-50">
           <div className="flex bg-white/10 backdrop-blur-xl p-1 rounded-xl border border-white/20 shadow-xl items-center">
            {AESTHETIC_COLLECTION.map((url) => (
              <button key={url} onClick={() => { setImage(url); setImageLoaded(false); }} className={`w-8 h-8 rounded-md overflow-hidden border m-0.5 transition-all ${image === url ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                <img src={url.replace('w=800', 'w=100')} className="w-full h-full object-cover" alt="Preset" />
              </button>
            ))}
            <div className="w-px h-5 bg-white/20 mx-1"></div>
            <button onClick={() => { setImage(getRandomCover()); setImageLoaded(false); }} className="w-8 h-8 rounded-md border border-white/20 m-0.5 flex items-center justify-center text-white hover:bg-white/20 transition-all active:rotate-90">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 bg-surface border-b border-surface-highlight shadow-sm z-[110] px-2 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => execCommand('Undo')} title="Undo" className={toolbarBtnClass()}><Undo className="w-4 h-4"/></button>
            <button onClick={() => execCommand('Redo')} title="Redo" className={toolbarBtnClass()}><Redo className="w-4 h-4"/></button>
            <div className="w-px h-6 bg-surface-highlight mx-2"></div>
            <button onClick={() => execCommand('ToggleStrong')} title="Bold" className={toolbarBtnClass(activeStates.bold)}><Bold className="w-4 h-4"/></button>
            <button onClick={() => execCommand('ToggleEmphasis')} title="Italic" className={toolbarBtnClass(activeStates.italic)}><Italic className="w-4 h-4"/></button>
            <button onClick={() => execCommand('WrapInBulletList')} title="List" className={toolbarBtnClass(activeStates.bulletList)}><List className="w-4 h-4"/></button>
            <button onClick={() => execCommand('ToggleInlineCode')} title="Code" className={toolbarBtnClass(activeStates.code)}><Code className="w-4 h-4"/></button>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-secondary font-mono text-[9px] uppercase tracking-widest bg-surface-highlight/30 px-5 py-2 rounded-full border border-surface-highlight">
             <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span>{wordCount} words</span>
             </div>
             <div className="w-px h-3 bg-secondary/20"></div>
             <span>Drafting</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowImagePrompt(true)} title="Insert Image" className={toolbarBtnClass()}><ImageIcon className="w-4 h-4"/></button>
            <div className="w-px h-6 bg-surface-highlight mx-1"></div>
            
            <div className="relative" ref={aiMenuRef}>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAiMenu(!showAiMenu);
                }} 
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${showAiMenu ? 'bg-accent text-accent-fg shadow-lg' : 'bg-accent/10 text-accent hover:bg-accent/20'}`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isProcessing ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">AI Assistant</span>
              </button>
              
              {showAiMenu && (
                <div className="absolute right-0 top-full mt-3 w-60 bg-surface border border-surface-highlight rounded-2xl shadow-2xl p-2 flex flex-col z-[200] animate-scale-in">
                  <div className="px-3 py-2 text-[9px] font-bold text-secondary uppercase tracking-tighter opacity-50 border-b border-surface-highlight mb-1">Text Processing</div>
                  <button onClick={() => handleAIEdit('IMPROVE')} className="flex items-center gap-3 px-3 py-3 hover:bg-accent/5 text-primary text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all">
                    <Wand2 className="w-4 h-4 text-accent"/> Polish Flow
                  </button>
                  <button onClick={() => handleAIEdit('REPHRASE')} className="flex items-center gap-3 px-3 py-3 hover:bg-accent/5 text-primary text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all">
                    <Type className="w-4 h-4 text-accent"/> Elegant Rephrase
                  </button>
                  <div className="h-px bg-surface-highlight my-1"></div>
                  <div className="px-3 py-2 text-[9px] font-bold text-secondary uppercase tracking-tighter opacity-50 border-b border-surface-highlight mb-1">Organization</div>
                  <button onClick={handleExtractTasks} className="flex items-center gap-3 px-3 py-3 hover:bg-accent/5 text-primary text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all">
                    <BrainCircuit className="w-4 h-4 text-accent"/> Extract Tasks
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar page-content-wrapper cursor-text bg-bg/50" onClick={() => editorRef.current?.action(ctx => ctx.get(editorViewCtx)?.focus())}>
        <div className="max-w-5xl mx-auto px-6 sm:px-10 pt-10 pb-48 min-h-full">
          <MilkdownProvider>
            <EditorInstance 
              key={initialId || 'new'}
              defaultValue={contentRef.current} 
              onMarkdownUpdate={handleContentUpdate}
              onEditorReady={handleEditorReady}
              onStateChange={handleStateChange}
            />
          </MilkdownProvider>
        </div>
      </div>

      {showImagePrompt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" role="dialog" aria-modal="true">
          <div className="bg-surface rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-white/5 animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-display font-bold text-primary">Add Visual</h3>
              <button onClick={() => setShowImagePrompt(false)} className="p-2 hover:bg-surface-highlight rounded-xl transition-all active:scale-90"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-6">
              <button onClick={() => localImageInputRef.current?.click()} className="w-full py-8 bg-surface-highlight hover:bg-accent hover:text-accent-fg border-2 border-dashed border-accent/20 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group">
                <Paperclip className="w-8 h-8 text-accent group-hover:text-accent-fg transition-colors" />
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
                }} className="flex-1 px-5 py-4 bg-surface-highlight border border-transparent focus:border-accent rounded-xl outline-none text-primary transition-all text-xs" placeholder="Paste URL..." />
                <button onClick={() => {
                  if (imgUrlInput.trim()) {
                    const currentText = contentRef.current + `\n\n![Image](${imgUrlInput.trim()})\n\n`;
                    editorRef.current?.action(replaceAll(currentText));
                    contentRef.current = currentText;
                    setImgUrlInput('');
                    setShowImagePrompt(false);
                  }
                }} className="p-4 bg-accent text-accent-fg rounded-xl active:scale-90"><Plus className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};