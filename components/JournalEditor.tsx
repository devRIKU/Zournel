import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { 
  ArrowLeft, Sparkles, Wand2, Save, X, 
  Bold, Italic, List, ListOrdered, Strikethrough, Code, Undo, Redo, 
  ChevronDown, Loader2, Feather, LayoutTemplate, ImageOff, Check, FileText,
  History, CheckCircle, XCircle, Heading1, Heading2, Quote, Minus,
  MoreHorizontal, CheckCheck, RefreshCw, Maximize2, Shuffle, Command, Search
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
import { editJournalText, AiActionType } from '../services/geminiService';

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
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
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
      setShowSlashMenu(false);
      setSlashQuery('');
      setSelectedCategory('All');
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
    
    // Detect slash command at current input or line end
    const match = md.match(/(?:\n|^|\s)\/([a-zA-Z0-9]*)$/);
    if (match) {
      setShowSlashMenu(true);
      setSlashQuery(match[1].toLowerCase());
    } else {
      setShowSlashMenu(false);
      setSlashQuery('');
    }
  }, []);

  const updateActiveStates = useCallback((editor: Editor) => {
  }, []);

  const callCommand = (command: any, payload?: any) => {
    editorRef.current?.action((ctx) => ctx.get(commandsCtx).call(command, payload));
    // Close mobile menu after selection if open
    if (showToolbarMore) setShowToolbarMore(false);
  };

  const handleRandomCover = () => {
    setImage(getRandomCover());
    setImgLoading(true);
    setImgError(false);
  };

  const getCleanedContent = (raw: string) => {
    const match = raw.match(/(?:\n|^|\s)\/([a-zA-Z0-9]*)$/);
    if (!match) return raw;
    const matchIdx = match.index!;
    const leadingChar = match[0].charAt(0);
    const keepLeading = (leadingChar === '\n' || leadingChar === ' ');
    return raw.slice(0, matchIdx + (keepLeading ? 1 : 0));
  };

  const handleAiAction = async (type: AiActionType, explicitText?: string) => {
    const textToProcess = explicitText !== undefined ? explicitText : content;
    if (!editorRef.current || !textToProcess.trim()) return;
    setIsProcessing(true);
    setShowAiMenu(false);
    try {
      const result = await editJournalText(textToProcess, type, selectedModel);
      if (result && result !== textToProcess) {
        setPreviewText(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const runSlashCommand = (cmdId: string) => {
    setShowSlashMenu(false);
    setSlashQuery('');

    // Clean slash query from content
    const clean = content.replace(/(?:\n|^|\s)\/([a-zA-Z0-9\s]*)$/, (match) => {
      const leadingChar = match.charAt(0);
      return (leadingChar === '\n' || leadingChar === ' ') ? leadingChar : '';
    });

    if (cmdId === 'h1' || cmdId === 'h2' || cmdId === 'bullet' || cmdId === 'number' || cmdId === 'quote' || cmdId === 'code' || cmdId === 'hr') {
      const lines = clean.split('\n');
      let targetIdx = lines.length - 1;
      
      // Target the line where the command was typed (last line or last non-empty line)
      if (lines[targetIdx].trim() === '' && targetIdx > 0 && lines[targetIdx - 1].trim() !== '') {
        targetIdx = targetIdx - 1;
      }

      const originalText = lines[targetIdx] || '';
      const strippedText = originalText.replace(/^[#*>\-\d.\s]+/, '').trim();

      if (cmdId === 'h1') {
        lines[targetIdx] = `# ${strippedText}`;
      } else if (cmdId === 'h2') {
        lines[targetIdx] = `## ${strippedText}`;
      } else if (cmdId === 'bullet') {
        lines[targetIdx] = `- ${strippedText}`;
      } else if (cmdId === 'number') {
        lines[targetIdx] = `1. ${strippedText}`;
      } else if (cmdId === 'quote') {
        lines[targetIdx] = `> ${strippedText}`;
      } else if (cmdId === 'code') {
        lines[targetIdx] = strippedText ? `\`${strippedText}\`` : '```\n\n```';
      } else if (cmdId === 'hr') {
        lines[targetIdx] = strippedText ? `${strippedText}\n\n---` : '---';
      }

      const updatedMd = lines.join('\n');

      if (editorRef.current) {
        editorRef.current.action(replaceAll(updatedMd));
        setContent(updatedMd);
      }
    } else if (cmdId === 'proofread' || cmdId === 'rewrite' || cmdId === 'improve' || cmdId === 'poetic' || cmdId === 'summarize' || cmdId === 'expand') {
      if (editorRef.current) {
        editorRef.current.action(replaceAll(clean));
        setContent(clean);
      }
      handleAiAction(cmdId as AiActionType, clean);
    } else if (cmdId === 'random') {
      if (editorRef.current) {
        editorRef.current.action(replaceAll(clean));
        setContent(clean);
      }
      handleRandomCover();
    }
  };

  const ALL_SLASH_COMMANDS = [
    { id: 'h1', label: 'Heading 1', desc: 'Large title heading', cat: 'Styling', icon: Heading1 },
    { id: 'h2', label: 'Heading 2', desc: 'Medium section heading', cat: 'Styling', icon: Heading2 },
    { id: 'bullet', label: 'Bullet List', desc: 'Simple bulleted list', cat: 'Styling', icon: List },
    { id: 'number', label: 'Numbered List', desc: 'Ordered list sequence', cat: 'Styling', icon: ListOrdered },
    { id: 'quote', label: 'Blockquote', desc: 'Emphasized quote text block', cat: 'Styling', icon: Quote },
    { id: 'code', label: 'Code Snippet', desc: 'Monospaced inline code', cat: 'Styling', icon: Code },
    { id: 'hr', label: 'Divider Line', desc: 'Horizontal line break', cat: 'Styling', icon: Minus },
    { id: 'proofread', label: 'Proofread & Fix', desc: 'Correct grammar & typos', cat: 'AI Assistant', icon: CheckCheck },
    { id: 'rewrite', label: 'Rewrite & Rephrase', desc: 'Improve structure & flow', cat: 'AI Assistant', icon: RefreshCw },
    { id: 'improve', label: 'Polish Flow', desc: 'Enhance vocabulary & clarity', cat: 'AI Assistant', icon: Wand2 },
    { id: 'poetic', label: 'Poetic Style', desc: 'Literary & lyrical tone', cat: 'AI Assistant', icon: Feather },
    { id: 'summarize', label: 'Summarize', desc: 'Key insight paragraph', cat: 'AI Assistant', icon: FileText },
    { id: 'expand', label: 'Expand Reflection', desc: 'Deepen thoughts & details', cat: 'AI Assistant', icon: Maximize2 },
    { id: 'random', label: 'Random Cover Photo', desc: 'Shuffle aesthetic cover image', cat: 'Media', icon: Shuffle },
  ];

  const COMMAND_CATEGORIES = ['All', 'Styling', 'AI Assistant', 'Media'];

  const filteredSlashCommands = ALL_SLASH_COMMANDS.filter(cmd => {
    const matchesCat = selectedCategory === 'All' || cmd.cat === selectedCategory;
    const q = slashQuery.trim().toLowerCase();
    const matchesQuery = !q || 
      cmd.id.toLowerCase().includes(q) || 
      cmd.label.toLowerCase().includes(q) || 
      cmd.desc.toLowerCase().includes(q) ||
      cmd.cat.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [slashQuery, selectedCategory]);

  useEffect(() => {
    if (!showSlashMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredSlashCommands.length ? (prev + 1) % filteredSlashCommands.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredSlashCommands.length ? (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length : 0));
      } else if (e.key === 'Enter') {
        if (filteredSlashCommands.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const selectedCmd = filteredSlashCommands[selectedIndex] || filteredSlashCommands[0];
          if (selectedCmd) {
            runSlashCommand(selectedCmd.id);
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showSlashMenu, selectedIndex, filteredSlashCommands, content]);

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
                onClick={handleRandomCover}
                className="flex items-center gap-2 px-3 md:px-5 py-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all font-grotesk text-[10px] md:text-xs font-bold uppercase tracking-widest text-white active:scale-95"
                title="Random Cover Photo"
             >
                <Shuffle className="w-3.5 h-3.5 md:w-4 h-4" />
                <span className="hidden sm:inline">Random</span>
             </button>

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
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        handleRandomCover();
                        setShowGallery(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-accent/15 text-accent border border-accent/30 rounded-xl hover:bg-accent/25 transition-all text-xs font-bold uppercase tracking-wider"
                    >
                      <Shuffle className="w-4 h-4" />
                      <span>Surprise Me</span>
                    </button>
                    <button onClick={() => setShowGallery(false)} className="p-3 hover:bg-surface-highlight rounded-xl transition-colors">
                      <X className="w-5 h-5 text-secondary" />
                    </button>
                  </div>
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
                  <button onClick={() => handleAiAction('PROOFREAD')} className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-surface-highlight text-left group transition-colors">
                    <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                      <CheckCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-primary">Proofread & Fix</span>
                    </div>
                  </button>
                  <button onClick={() => handleAiAction('REWRITE')} className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-surface-highlight text-left group transition-colors">
                    <div className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-primary">Rewrite & Rephrase</span>
                    </div>
                  </button>
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
                  <button onClick={() => handleAiAction('EXPAND')} className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-surface-highlight text-left group transition-colors">
                    <div className="p-1.5 bg-rose-500/10 text-rose-600 rounded-lg group-hover:scale-110 transition-transform">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-primary">Expand Reflection</span>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>


        </div>

        <div className="flex-grow overflow-y-auto no-scrollbar bg-surface rounded-2xl md:rounded-[2rem] p-4 md:p-8 border border-surface-highlight shadow-sm relative">
          {/* Floating Slash Commands Popover / Mobile Sheet */}
          <AnimatePresence>
            {showSlashMenu && (
              <>
                {/* Mobile Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowSlashMenu(false)}
                  className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden"
                  aria-hidden="true"
                />

                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.98 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                  className="fixed inset-x-3 bottom-3 md:absolute md:inset-auto md:top-3 md:left-8 md:w-88 z-50 bg-surface/95 backdrop-blur-2xl border border-accent/30 shadow-2xl rounded-2xl md:rounded-3xl p-3 max-h-[82vh] md:max-h-96 flex flex-col no-scrollbar"
                  role="dialog"
                  aria-label="Slash Commands Palette"
                >
                  {/* Header & Close */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-highlight/60 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-wider">
                      <Command className="w-4 h-4" />
                      <span>Commands</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-[10px] font-mono text-accent">
                        {filteredSlashCommands.length}
                      </span>
                    </div>
                    <button 
                      onClick={() => setShowSlashMenu(false)} 
                      className="p-1.5 hover:bg-surface-highlight rounded-xl text-secondary transition-colors"
                      aria-label="Close menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Integrated Search Input */}
                  <div className="relative mb-2 shrink-0">
                    <Search className="w-3.5 h-3.5 text-secondary/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={slashQuery}
                      onChange={(e) => setSlashQuery(e.target.value)}
                      placeholder="Type command or search..."
                      className="w-full bg-surface-highlight/40 focus:bg-surface-highlight text-xs font-medium pl-8 pr-3 py-2 rounded-xl border border-transparent focus:border-accent/40 text-primary outline-none transition-all placeholder:text-secondary/50"
                      autoFocus
                      aria-label="Search slash commands"
                    />
                  </div>

                  {/* Category Chips */}
                  <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-surface-highlight/40 overflow-x-auto no-scrollbar shrink-0">
                    {COMMAND_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all ${
                          selectedCategory === cat 
                            ? 'bg-accent text-accent-fg shadow-xs' 
                            : 'bg-surface-highlight/50 hover:bg-surface-highlight text-secondary hover:text-primary'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Commands List */}
                  <div className="overflow-y-auto no-scrollbar space-y-1 pr-0.5" role="listbox">
                    {filteredSlashCommands.length === 0 ? (
                      <div className="py-6 text-center text-xs text-secondary opacity-60">
                        No matching commands found
                      </div>
                    ) : (
                      filteredSlashCommands.map((cmd, idx) => {
                        const IconComp = cmd.icon;
                        const isSelected = idx === selectedIndex;
                        return (
                          <button
                            key={cmd.id}
                            id={`cmd-item-${cmd.id}`}
                            onClick={() => runSlashCommand(cmd.id)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            role="option"
                            aria-selected={isSelected}
                            className={`flex items-center gap-3 w-full p-2.5 sm:p-2 rounded-xl text-left transition-all min-h-[44px] ${
                              isSelected 
                                ? 'bg-accent/15 border border-accent/30 shadow-sm' 
                                : 'hover:bg-surface-highlight border border-transparent'
                            }`}
                          >
                            <div className={`p-2 rounded-lg transition-transform shrink-0 ${
                              isSelected ? 'bg-accent text-accent-fg scale-105' : 'bg-accent/10 text-accent group-hover:scale-110'
                            }`}>
                              <IconComp className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`block text-xs font-semibold truncate ${isSelected ? 'text-accent font-bold' : 'text-primary'}`}>
                                  {cmd.label}
                                </span>
                                <span className="text-[9px] font-mono text-secondary/50 uppercase tracking-tight">{cmd.cat}</span>
                              </div>
                              <span className="block text-[10px] text-secondary truncate opacity-70 mt-0.5">{cmd.desc}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

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