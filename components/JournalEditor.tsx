import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { 
  ArrowLeft, Sparkles, Wand2, Save, X, 
  Bold, Italic, List, ListOrdered, Strikethrough, Code, Undo, Redo, 
  ChevronDown, Loader2, Feather, LayoutTemplate, ImageOff, Check, FileText,
  History, CheckCircle, XCircle, Heading1, Heading2, Heading3, Heading4, Quote, Minus,
  MoreHorizontal, CheckCheck, RefreshCw, Maximize2, Shuffle, Command, Search,
  CheckSquare, MessageSquareCode, Table as TableIcon, Lightbulb,
  GripVertical, Plus, Trash2, Copy, ArrowUp, ArrowDown
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
import { editJournalText, detectMoodFromJournal, AiActionType } from '../services/geminiService';

const PRESET_MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '⚡', label: 'Energetic' },
  { emoji: '🙏', label: 'Grateful' },
  { emoji: '💡', label: 'Inspired' },
  { emoji: '🎯', label: 'Focused' },
  { emoji: '🏆', label: 'Proud' },
  { emoji: '☕', label: 'Cozy' },
  { emoji: '💭', label: 'Reflective' },
  { emoji: '🌊', label: 'Nostalgic' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '🤯', label: 'Stressed' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Tense' }
];

interface JournalEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string, image: string | undefined, mood?: string, isAutoSave?: boolean) => void;
  onDelete?: (id: string) => void;
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

// Picks from the entire Picsum catalogue using a unique seed
const getRandomCover = () => {
  const seed = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  return `https://picsum.photos/seed/${seed}/1200/400`;
};

const EditorInstance = memo(({ defaultValue, onMarkdownUpdate, onEditorReady, onStateChange }: { 
  defaultValue: string; 
  onMarkdownUpdate: (markdown: string) => void;
  onEditorReady: (editor: Editor) => void;
  onStateChange: (editor: Editor) => void;
}) => {
  const onMarkdownUpdateRef = useRef(onMarkdownUpdate);
  const onEditorReadyRef = useRef(onEditorReady);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onMarkdownUpdateRef.current = onMarkdownUpdate;
    onEditorReadyRef.current = onEditorReady;
    onStateChangeRef.current = onStateChange;
  });

  const initialValueRef = useRef(defaultValue);
  
  useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialValueRef.current);
        const l = ctx.get(listenerCtx);
        l.markdownUpdated((_, markdown) => {
          onMarkdownUpdateRef.current(markdown);
          onStateChangeRef.current(editor);
        });
        l.updated((_) => {
           onStateChangeRef.current(editor);
        });
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener);
    
    onEditorReadyRef.current(editor);
    return editor;
  }, []); 

  return <Milkdown />;
});

export const JournalEditor: React.FC<JournalEditorProps> = ({ 
  isOpen, onClose, onSave, onDelete, initialContent = '', initialImage, initialId, initialMood, selectedModel 
}) => {
  const [content, setContent] = useState(() => initialContent);
  const [image, setImage] = useState<string>(() => initialImage || getRandomCover());
  const [mood, setMood] = useState<string | undefined>(() => initialMood);
  const [showMoodMenu, setShowMoodMenu] = useState(false);
  const [customMoodInput, setCustomMoodInput] = useState('');
  const [isAutoDetectingMood, setIsAutoDetectingMood] = useState(false);
  const [autoMoodActive, setAutoMoodActive] = useState<boolean>(() => initialMood === '✨ Auto');
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
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null);

  // Auto-Save state & refs
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef<boolean>(true);

  // Notion/BlockNote Style Floating Selection Toolbar & Block Handle State
  const [bubbleMenuPos, setBubbleMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [blockHandlePos, setBlockHandlePos] = useState<{ top: number; node: HTMLElement } | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  const updateSelectionBubble = useCallback(() => {
    if (!editorContainerRef.current) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
      const text = sel.toString().trim();
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = editorContainerRef.current.getBoundingClientRect();

      if (
        rect.bottom >= containerRect.top &&
        rect.top <= containerRect.bottom &&
        rect.right >= containerRect.left &&
        rect.left <= containerRect.right
      ) {
        const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches);
        let left = rect.left + rect.width / 2 - containerRect.left + editorContainerRef.current.scrollLeft;
        
        // On mobile, position cursor bubble toolbar clear of native OS selection callout ribbons
        let top = isMobile
          ? rect.top - containerRect.top + editorContainerRef.current.scrollTop - 58
          : rect.top - containerRect.top + editorContainerRef.current.scrollTop - 48;

        const paddingHorizontal = isMobile ? 120 : 110;
        if (left < paddingHorizontal) left = paddingHorizontal;
        if (left > containerRect.width - paddingHorizontal) left = containerRect.width - paddingHorizontal;
        
        if (top < 12) {
          top = rect.bottom - containerRect.top + editorContainerRef.current.scrollTop + (isMobile ? 18 : 10);
        }

        setBubbleMenuPos({ top, left });
        setSelectedText(text);
        return;
      }
    }
    setBubbleMenuPos(null);
    setSelectedText('');
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      updateSelectionBubble();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateSelectionBubble]);

  const handleMouseMoveContainer = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!editorContainerRef.current || showBlockMenu) return;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
    
    const containerRect = editorContainerRef.current.getBoundingClientRect();
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (!target) return;

    const blockNode = target.closest('.ProseMirror > *, .ProseMirror ul > li, .ProseMirror ol > li') as HTMLElement | null;
    if (blockNode && editorContainerRef.current.contains(blockNode)) {
      const nodeRect = blockNode.getBoundingClientRect();
      const top = nodeRect.top - containerRect.top + editorContainerRef.current.scrollTop + 2;
      setBlockHandlePos({ top, node: blockNode });
    }
  }, [showBlockMenu]);

  const handleMouseLeaveContainer = useCallback(() => {
    if (!showBlockMenu) {
      setBlockHandlePos(null);
    }
  }, [showBlockMenu]);

  const updateSlashMenuPosition = useCallback(() => {
    if (!editorContainerRef.current) return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0).cloneRange();
      const rect = range.getBoundingClientRect();
      const containerRect = editorContainerRef.current.getBoundingClientRect();

      if (rect && (rect.top !== 0 || rect.left !== 0)) {
        let left = rect.left - containerRect.left + editorContainerRef.current.scrollLeft;
        let top = rect.bottom - containerRect.top + editorContainerRef.current.scrollTop + 6;

        // Ensure menu fits within container boundaries
        const menuWidth = 310;
        const menuHeight = 310;

        if (left + menuWidth > containerRect.width - 16) {
          left = Math.max(8, containerRect.width - menuWidth - 16);
        }
        if (left < 8) left = 8;

        if (top + menuHeight > containerRect.height + editorContainerRef.current.scrollTop - 16) {
          const aboveTop = (rect.top - containerRect.top + editorContainerRef.current.scrollTop) - menuHeight - 6;
          if (aboveTop >= 8) {
            top = aboveTop;
          }
        }
        if (top < 8) top = 8;

        setSlashMenuPos({ top, left });
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      isInitialMountRef.current = true;
      setSaveStatus(null);
      setContent(initialContent || '');
      setImage(initialImage || getRandomCover());
      setMood(initialMood);
      setAutoMoodActive(initialMood === '✨ Auto');
      setCustomMoodInput('');
      setIsAutoDetectingMood(false);
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
      setBubbleMenuPos(null);
      setSelectedText('');
      setBlockHandlePos(null);
      setShowBlockMenu(false);
    }
  }, [isOpen, initialContent, initialImage, initialMood]);

  // Debounced Auto-Save Effect
  useEffect(() => {
    if (!isOpen) return;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (!content.trim()) return;

    setSaveStatus('unsaved');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      onSave(content, image, mood, true);
      setTimeout(() => {
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 300);
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [content, image, mood, isOpen, onSave]);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  const handleMarkdownUpdate = useCallback((md: string) => {
    setContent(md);
    
    // Detect slash command at current input or line end
    const match = md.match(/(?:^|\n|\s)\/([a-zA-Z0-9\s_-]*)$/);
    if (match) {
      setShowSlashMenu(true);
      setSlashQuery(match[1].toLowerCase());
      requestAnimationFrame(() => {
        updateSlashMenuPosition();
      });
    } else {
      setShowSlashMenu(false);
      setSlashQuery('');
    }
  }, [updateSlashMenuPosition]);

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

  const modifyTargetBlock = (action: 'turn' | 'duplicate' | 'delete' | 'moveUp' | 'moveDown' | 'ai', param?: string) => {
    if (!blockHandlePos?.node) return;
    const targetText = blockHandlePos.node.textContent || '';
    const lines = content.split('\n');
    
    let lineIdx = lines.findIndex(l => targetText.trim() && l.includes(targetText.trim()));
    if (lineIdx === -1 && targetText.trim()) {
      lineIdx = lines.findIndex(l => targetText.trim().includes(l.trim()) && l.trim().length > 0);
    }
    if (lineIdx === -1) lineIdx = Math.max(0, lines.length - 1);

    const currentLine = lines[lineIdx] || '';
    const cleanLineText = currentLine.replace(/^[#*>\-\d.\[\]\s]+/, '').trim();

    let newLines = [...lines];

    if (action === 'turn') {
      if (param === 'h1') newLines[lineIdx] = `# ${cleanLineText}`;
      else if (param === 'h2') newLines[lineIdx] = `## ${cleanLineText}`;
      else if (param === 'h3') newLines[lineIdx] = `### ${cleanLineText}`;
      else if (param === 'bullet') newLines[lineIdx] = `- ${cleanLineText}`;
      else if (param === 'todo') newLines[lineIdx] = `- [ ] ${cleanLineText || 'Task item'}`;
      else if (param === 'quote') newLines[lineIdx] = `> ${cleanLineText}`;
      else if (param === 'code') newLines[lineIdx] = `\`\`\`\n${cleanLineText}\n\`\`\``;
      else if (param === 'text') newLines[lineIdx] = cleanLineText;
    } else if (action === 'duplicate') {
      newLines.splice(lineIdx + 1, 0, currentLine);
    } else if (action === 'delete') {
      newLines.splice(lineIdx, 1);
    } else if (action === 'moveUp' && lineIdx > 0) {
      const temp = newLines[lineIdx];
      newLines[lineIdx] = newLines[lineIdx - 1];
      newLines[lineIdx - 1] = temp;
    } else if (action === 'moveDown' && lineIdx < newLines.length - 1) {
      const temp = newLines[lineIdx];
      newLines[lineIdx] = newLines[lineIdx + 1];
      newLines[lineIdx + 1] = temp;
    } else if (action === 'ai') {
      handleAiAction('IMPROVE', currentLine);
      setShowBlockMenu(false);
      return;
    }

    const updatedMd = newLines.join('\n');
    if (editorRef.current) {
      editorRef.current.action(replaceAll(updatedMd));
      setContent(updatedMd);
    }
    setShowBlockMenu(false);
    setBlockHandlePos(null);
  };

  const runSlashCommand = (cmdId: string) => {
    setShowSlashMenu(false);
    setSlashQuery('');

    // Clean slash query from content
    const clean = content.replace(/(?:^|\n|\s)\/([a-zA-Z0-9\s_-]*)$/, (match) => {
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
      } else if (cmdId === 'h3') {
        lines[targetIdx] = `### ${strippedText}`;
      } else if (cmdId === 'h4') {
        lines[targetIdx] = `#### ${strippedText}`;
      } else if (cmdId === 'bullet') {
        lines[targetIdx] = `- ${strippedText}`;
      } else if (cmdId === 'number') {
        lines[targetIdx] = `1. ${strippedText}`;
      } else if (cmdId === 'todo') {
        lines[targetIdx] = `- [ ] ${strippedText || 'New task'}`;
      } else if (cmdId === 'quote') {
        lines[targetIdx] = `> ${strippedText}`;
      } else if (cmdId === 'callout') {
        lines[targetIdx] = `> 💡 **Note:** ${strippedText || 'Important highlight'}`;
      } else if (cmdId === 'code') {
        lines[targetIdx] = strippedText ? `\`\`\`\n${strippedText}\n\`\`\`` : '```\n\n```';
      } else if (cmdId === 'table') {
        lines[targetIdx] = `| Topic | Details |\n| --- | --- |\n| ${strippedText || 'Item 1'} | Value 1 |\n| Item 2 | Value 2 |`;
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
    { id: 'h1', label: 'Heading 1', desc: 'Large title heading', cat: 'Styling', icon: Heading1, keywords: ['title', 'h1', 'heading', 'large', 'header'] },
    { id: 'h2', label: 'Heading 2', desc: 'Medium section heading', cat: 'Styling', icon: Heading2, keywords: ['subheading', 'h2', 'heading', 'medium', 'section'] },
    { id: 'h3', label: 'Heading 3', desc: 'Small section title', cat: 'Styling', icon: Heading3, keywords: ['subheading', 'h3', 'heading', 'small'] },
    { id: 'h4', label: 'Heading 4', desc: 'Minor topic title', cat: 'Styling', icon: Heading4, keywords: ['h4', 'heading', 'minor', 'label'] },
    { id: 'bullet', label: 'Bullet List', desc: 'Simple bulleted list', cat: 'Styling', icon: List, keywords: ['bullet', 'list', 'unordered', 'point', 'dot'] },
    { id: 'number', label: 'Numbered List', desc: 'Ordered list sequence', cat: 'Styling', icon: ListOrdered, keywords: ['number', 'list', 'ordered', 'sequence', '1.'] },
    { id: 'todo', label: 'Task Checkbox', desc: 'Interactive task item', cat: 'Styling', icon: CheckSquare, keywords: ['task', 'todo', 'checkbox', 'check', 'list'] },
    { id: 'quote', label: 'Blockquote', desc: 'Emphasized quote block', cat: 'Styling', icon: Quote, keywords: ['quote', 'blockquote', 'cite'] },
    { id: 'callout', label: 'Callout Box', desc: 'Highlighted note box', cat: 'Styling', icon: Lightbulb, keywords: ['callout', 'note', 'box', 'highlight', 'tip', 'notice'] },
    { id: 'code', label: 'Code Snippet', desc: 'Monospaced block', cat: 'Styling', icon: Code, keywords: ['code', 'snippet', 'block', 'programming', 'pre'] },
    { id: 'table', label: 'Table', desc: 'Structured grid table', cat: 'Styling', icon: TableIcon, keywords: ['table', 'grid', 'column', 'row', 'data'] },
    { id: 'hr', label: 'Divider Line', desc: 'Horizontal line break', cat: 'Styling', icon: Minus, keywords: ['divider', 'line', 'hr', 'break', 'separator'] },
    { id: 'proofread', label: 'Proofread & Fix', desc: 'Correct grammar & typos', cat: 'AI Assistant', icon: CheckCheck, keywords: ['proofread', 'grammar', 'fix', 'ai', 'check'] },
    { id: 'rewrite', label: 'Rewrite & Rephrase', desc: 'Improve structure & flow', cat: 'AI Assistant', icon: RefreshCw, keywords: ['rewrite', 'rephrase', 'tone', 'ai', 'structure'] },
    { id: 'improve', label: 'Polish Flow', desc: 'Enhance vocabulary & clarity', cat: 'AI Assistant', icon: Wand2, keywords: ['polish', 'improve', 'flow', 'ai', 'clarity'] },
    { id: 'poetic', label: 'Poetic Style', desc: 'Literary & lyrical tone', cat: 'AI Assistant', icon: Feather, keywords: ['poetic', 'lyrical', 'style', 'ai', 'creative'] },
    { id: 'summarize', label: 'Summarize', desc: 'Key insight paragraph', cat: 'AI Assistant', icon: FileText, keywords: ['summarize', 'summary', 'overview', 'ai', 'insights'] },
    { id: 'expand', label: 'Expand Reflection', desc: 'Deepen thoughts & details', cat: 'AI Assistant', icon: Maximize2, keywords: ['expand', 'elaborate', 'detail', 'ai', 'more'] },
    { id: 'random', label: 'Random Cover Photo', desc: 'Shuffle full Picsum catalogue', cat: 'Media', icon: Shuffle, keywords: ['cover', 'photo', 'image', 'shuffle', 'random', 'background', 'picsum'] },
  ];

  const COMMAND_CATEGORIES = ['All', 'Styling', 'AI Assistant', 'Media'];

  const filteredSlashCommands = ALL_SLASH_COMMANDS.filter(cmd => {
    const matchesCat = selectedCategory === 'All' || cmd.cat === selectedCategory;
    const q = slashQuery.trim().toLowerCase();
    if (!q) return matchesCat;
    const matchesQuery = 
      cmd.id.toLowerCase().includes(q) || 
      cmd.label.toLowerCase().includes(q) || 
      cmd.desc.toLowerCase().includes(q) ||
      cmd.cat.toLowerCase().includes(q) ||
      cmd.keywords.some(k => k.toLowerCase().includes(q));
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
      } else if (e.key === 'Enter' || e.key === 'Tab') {
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

  const handleAutoDetectMood = async (manualTrigger: boolean = true) => {
    if (!content || content.trim().length < 5) {
      if (manualTrigger) {
        alert("Please write a few words in your entry first so AI can detect your mood!");
      }
      return;
    }
    setIsAutoDetectingMood(true);
    try {
      const result = await detectMoodFromJournal(content, selectedModel);
      if (result && result.fullMood) {
        setMood(result.fullMood);
        setAutoMoodActive(false);
        if (manualTrigger) {
          setShowMoodMenu(false);
        }
      } else if (manualTrigger) {
        alert("Could not detect mood. Make sure your Gemini API key is set in Settings.");
      }
    } catch (err) {
      console.error("Auto mood error:", err);
    } finally {
      setIsAutoDetectingMood(false);
    }
  };

  const handleAddCustomMood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMoodInput.trim()) return;
    const cleanCustom = customMoodInput.trim();
    const hasEmoji = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u.test(cleanCustom);
    const formattedMood = hasEmoji ? cleanCustom : `✨ ${cleanCustom}`;
    setMood(formattedMood);
    setAutoMoodActive(false);
    setCustomMoodInput('');
    setShowMoodMenu(false);
  };

  const handleSave = async () => {
    let finalMood = mood;
    if (autoMoodActive || mood === '✨ Auto') {
      if (content && content.trim().length >= 5) {
        setIsAutoDetectingMood(true);
        const autoRes = await detectMoodFromJournal(content, selectedModel);
        if (autoRes?.fullMood) {
          finalMood = autoRes.fullMood;
          setMood(finalMood);
        }
        setIsAutoDetectingMood(false);
      }
    }
    onSave(content, image, finalMood);
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
        
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center text-white z-10">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2.5 md:p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all active:scale-90" title="Back">
              <ArrowLeft className="w-5 h-5 md:w-6 h-6" />
            </button>
            {/* Auto-Save Status Indicator */}
            {saveStatus && (
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[11px] font-mono tracking-wide">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                    <span className="text-white/80">Saving draft...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-200">Auto-saved {lastSavedTime ? `at ${lastSavedTime}` : ''}</span>
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-200">Editing...</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
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

             {initialId && onDelete && (
               <button 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this memory?")) {
                      onDelete(initialId);
                      onClose();
                    }
                  }}
                  className="p-2 md:p-2.5 bg-red-500/20 hover:bg-red-600/90 text-white backdrop-blur-md rounded-full transition-all active:scale-90 border border-red-500/30"
                  title="Delete Memory"
               >
                  <Trash2 className="w-4 h-4" />
               </button>
             )}

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
              title="Add current emotional state or mood"
            >
              {isAutoDetectingMood ? (
                <Loader2 className="w-3.5 h-3.5 md:w-4 h-4 text-accent animate-spin" />
              ) : (
                <span className="text-sm md:text-base leading-none select-none">
                  {mood ? (mood.split(' ')[0] || '✨') : (autoMoodActive ? '✨' : '😊')}
                </span>
              )}
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider hidden sm:inline select-none">
                {isAutoDetectingMood 
                  ? 'Detecting...' 
                  : (mood 
                      ? (mood.split(' ').slice(1).join(' ') || mood) 
                      : (autoMoodActive ? 'Auto Mood' : 'Mood'))
                }
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
                  className="absolute right-0 top-full mt-2 w-64 sm:w-72 bg-surface rounded-2xl border border-surface-highlight shadow-2xl p-3 z-50 flex flex-col gap-2.5 max-h-[80vh] overflow-y-auto no-scrollbar"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-surface-highlight/50">
                    <span className="text-[10px] font-grotesk font-bold uppercase tracking-wider text-secondary">Select Emotional State</span>
                    {(mood || autoMoodActive) && (
                      <button 
                        onClick={() => {
                          setMood(undefined);
                          setAutoMoodActive(false);
                          setShowMoodMenu(false);
                        }}
                        className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Auto Mood Detector AI Button */}
                  <button 
                    onClick={() => handleAutoDetectMood(true)}
                    disabled={isAutoDetectingMood}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                      autoMoodActive || mood === '✨ Auto' 
                        ? 'bg-accent/15 border-accent text-accent font-semibold shadow-xs' 
                        : 'bg-accent/5 border-accent/20 hover:bg-accent/10 text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-accent/20 rounded-lg text-accent">
                        {isAutoDetectingMood ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          <span>✨ Auto Detect Mood</span>
                        </p>
                        <p className="text-[10px] text-secondary opacity-70">Analyze text with Gemini AI</p>
                      </div>
                    </div>
                    {(autoMoodActive || mood === '✨ Auto') && <Check className="w-4 h-4 text-accent" />}
                  </button>

                  {/* Preset Moods Grid */}
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-secondary/60 mb-1.5 block">Preset Moods</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PRESET_MOODS.map((item) => {
                        const itemString = `${item.emoji} ${item.label}`;
                        const isSelected = mood === itemString && !autoMoodActive;
                        return (
                          <button 
                            key={item.label}
                            onClick={() => {
                              setMood(itemString);
                              setAutoMoodActive(false);
                              setShowMoodMenu(false);
                            }} 
                            className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all ${
                              isSelected 
                                ? 'bg-accent text-accent-fg font-bold scale-105 shadow-sm' 
                                : 'bg-surface-highlight/30 hover:bg-surface-highlight text-primary'
                            }`}
                          >
                            <span className="text-xl mb-0.5 leading-none select-none">{item.emoji}</span>
                            <span className="text-[10px] font-medium truncate w-full">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Mood Input Form */}
                  <div className="pt-2 border-t border-surface-highlight/50">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-secondary/60 mb-1.5 block">Custom Mood</span>
                    <form onSubmit={handleAddCustomMood} className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. 🎨 Creative"
                        value={customMoodInput}
                        onChange={(e) => setCustomMoodInput(e.target.value)}
                        className="flex-1 bg-surface-highlight/40 border border-surface-highlight px-2.5 py-1.5 rounded-xl text-xs text-primary focus:outline-none focus:border-accent"
                      />
                      <button 
                        type="submit"
                        disabled={!customMoodInput.trim()}
                        className="p-2 bg-accent text-accent-fg rounded-xl hover:bg-accent/90 disabled:opacity-40 transition-colors"
                        title="Add Custom Mood"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
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

        <div 
          ref={editorContainerRef} 
          onMouseMove={handleMouseMoveContainer}
          onMouseLeave={handleMouseLeaveContainer}
          className="flex-grow overflow-y-auto no-scrollbar bg-surface rounded-2xl md:rounded-[2rem] p-4 md:p-8 border border-surface-highlight shadow-sm relative min-h-[350px]"
        >
          {/* Notion/BlockNote Style Block Handle (+ / ⋮⋮) */}
          <AnimatePresence>
            {blockHandlePos && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.1 }}
                style={{
                  position: 'absolute',
                  top: `${blockHandlePos.top}px`,
                  left: '2px',
                  zIndex: 40,
                }}
                className="flex items-center gap-0.5 bg-surface/80 sm:bg-surface/90 backdrop-blur-md border border-surface-highlight/70 shadow-xs rounded-lg sm:rounded-xl p-0.5 opacity-50 sm:opacity-90 hover:opacity-100 transition-opacity"
              >
                <button
                  onClick={() => {
                    setShowSlashMenu(true);
                    setSlashMenuPos({ top: blockHandlePos.top + 28, left: 16 });
                  }}
                  className="p-0.5 sm:p-1 hover:bg-accent/15 text-secondary hover:text-accent rounded-md sm:rounded-lg transition-colors"
                  title="Add Block (/)"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowBlockMenu(!showBlockMenu)}
                    className="p-0.5 sm:p-1 hover:bg-surface-highlight text-secondary hover:text-primary rounded-md sm:rounded-lg transition-colors cursor-grab"
                    title="Block Actions & Options"
                  >
                    <GripVertical className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>

                  {/* Block Options Popover */}
                  <AnimatePresence>
                    {showBlockMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-full top-0 ml-1.5 w-48 bg-surface/95 backdrop-blur-xl border border-accent/30 shadow-2xl rounded-2xl p-1.5 z-50 flex flex-col gap-0.5 text-xs font-sans"
                      >
                        <div className="px-2 py-1 text-[9px] font-bold text-secondary uppercase tracking-widest border-b border-surface-highlight/60">
                          Turn Into
                        </div>
                        <button onClick={() => modifyTargetBlock('turn', 'text')} className="flex items-center gap-2 p-1.5 hover:bg-surface-highlight rounded-lg text-primary text-left font-medium">
                          <FileText className="w-3.5 h-3.5 text-secondary" /> Text / Paragraph
                        </button>
                        <button onClick={() => modifyTargetBlock('turn', 'h1')} className="flex items-center gap-2 p-1.5 hover:bg-surface-highlight rounded-lg text-primary text-left font-medium">
                          <Heading1 className="w-3.5 h-3.5 text-accent" /> Heading 1
                        </button>
                        <button onClick={() => modifyTargetBlock('turn', 'h2')} className="flex items-center gap-2 p-1.5 hover:bg-surface-highlight rounded-lg text-primary text-left font-medium">
                          <Heading2 className="w-3.5 h-3.5 text-accent" /> Heading 2
                        </button>
                        <button onClick={() => modifyTargetBlock('turn', 'bullet')} className="flex items-center gap-2 p-1.5 hover:bg-surface-highlight rounded-lg text-primary text-left font-medium">
                          <List className="w-3.5 h-3.5 text-secondary" /> Bullet List
                        </button>
                        <button onClick={() => modifyTargetBlock('turn', 'todo')} className="flex items-center gap-2 p-1.5 hover:bg-surface-highlight rounded-lg text-primary text-left font-medium">
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-500" /> Task Checkbox
                        </button>
                        <button onClick={() => modifyTargetBlock('turn', 'quote')} className="flex items-center gap-2 p-1.5 hover:bg-surface-highlight rounded-lg text-primary text-left font-medium">
                          <Quote className="w-3.5 h-3.5 text-amber-500" /> Blockquote
                        </button>
                        <button onClick={() => modifyTargetBlock('turn', 'code')} className="flex items-center gap-2 p-1.5 hover:bg-surface-highlight rounded-lg text-primary text-left font-medium">
                          <Code className="w-3.5 h-3.5 text-purple-500" /> Code Block
                        </button>

                        <div className="h-px bg-surface-highlight/60 my-1"></div>

                        <div className="px-2 py-0.5 text-[9px] font-bold text-secondary uppercase tracking-widest">
                          Block Actions
                        </div>
                        <button onClick={() => modifyTargetBlock('duplicate')} className="flex items-center gap-2 p-1.5 hover:bg-surface-highlight rounded-lg text-primary text-left font-medium">
                          <Copy className="w-3.5 h-3.5 text-secondary" /> Duplicate Block
                        </button>
                        <button onClick={() => modifyTargetBlock('moveUp')} className="flex items-center gap-2 p-1.5 hover:bg-surface-highlight rounded-lg text-primary text-left font-medium">
                          <ArrowUp className="w-3.5 h-3.5 text-secondary" /> Move Up
                        </button>
                        <button onClick={() => modifyTargetBlock('moveDown')} className="flex items-center gap-2 p-1.5 hover:bg-surface-highlight rounded-lg text-primary text-left font-medium">
                          <ArrowDown className="w-3.5 h-3.5 text-secondary" /> Move Down
                        </button>
                        <button onClick={() => modifyTargetBlock('ai')} className="flex items-center gap-2 p-1.5 hover:bg-accent/15 rounded-lg text-accent text-left font-bold">
                          <Sparkles className="w-3.5 h-3.5" /> AI Polish Line
                        </button>
                        <button onClick={() => modifyTargetBlock('delete')} className="flex items-center gap-2 p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 text-left font-medium">
                          <Trash2 className="w-3.5 h-3.5" /> Delete Block
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notion/BlockNote Style Floating Selection Bubble Toolbar */}
          <AnimatePresence>
            {bubbleMenuPos && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                style={{
                  position: 'absolute',
                  top: `${bubbleMenuPos.top}px`,
                  left: `${bubbleMenuPos.left}px`,
                  transform: 'translateX(-50%)',
                  zIndex: 120,
                }}
                className="bg-surface/95 backdrop-blur-2xl border border-accent/40 shadow-2xl rounded-2xl p-1 flex items-center gap-0.5 pointer-events-auto touch-manipulation select-none max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(toggleStrongCommand.key)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-90 shrink-0"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(toggleEmphasisCommand.key)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-90 shrink-0"
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(toggleStrikethroughCommand.key)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-90 shrink-0"
                  title="Strikethrough"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(toggleInlineCodeCommand.key)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-90 shrink-0"
                  title="Inline Code"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-surface-highlight/60 mx-0.5 shrink-0"></div>

                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(wrapInHeadingCommand.key, 1)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-90 shrink-0"
                  title="H1"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(wrapInHeadingCommand.key, 2)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-90 shrink-0"
                  title="H2"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(wrapInBulletListCommand.key)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-90 shrink-0"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(wrapInBlockquoteCommand.key)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-90 shrink-0"
                  title="Quote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-surface-highlight/60 mx-0.5 shrink-0"></div>

                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAiAction('IMPROVE', selectedText)}
                  className="flex items-center gap-1 px-2 py-1 bg-accent text-accent-fg hover:bg-accent/90 rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider active:scale-95 shadow-2xs shrink-0"
                  title="Polish Selection with AI"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Polish</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compact Floating Slash Commands Popover anchored to cursor position */}
          <AnimatePresence>
            {showSlashMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{
                  position: 'absolute',
                  top: slashMenuPos ? `${slashMenuPos.top}px` : '16px',
                  left: slashMenuPos ? `${slashMenuPos.left}px` : '16px',
                  zIndex: 50,
                }}
                className="w-[280px] sm:w-[310px] max-h-[320px] bg-surface/95 backdrop-blur-2xl border border-accent/35 shadow-2xl rounded-2xl p-2.5 flex flex-col font-sans"
                role="dialog"
                aria-label="Slash Commands Palette"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-surface-highlight/60 shrink-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-accent uppercase tracking-wider">
                    <Command className="w-3.5 h-3.5" />
                    <span>Commands</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-accent/10 text-[9px] font-mono text-accent">
                      {filteredSlashCommands.length}
                    </span>
                  </div>
                  <button 
                    onClick={() => setShowSlashMenu(false)} 
                    className="p-1 hover:bg-surface-highlight rounded-lg text-secondary hover:text-primary transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Filter Search Input & Categories */}
                <div className="space-y-1 mb-1.5 shrink-0">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-secondary/60 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={slashQuery}
                      onChange={(e) => setSlashQuery(e.target.value)}
                      placeholder="Type to search..."
                      className="w-full bg-surface-highlight/50 focus:bg-surface-highlight text-xs font-medium pl-8 pr-2.5 py-1 rounded-lg border border-transparent focus:border-accent/40 text-primary outline-none transition-all placeholder:text-secondary/50"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    {COMMAND_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-semibold whitespace-nowrap transition-all ${
                          selectedCategory === cat 
                            ? 'bg-accent text-accent-fg shadow-2xs' 
                            : 'bg-surface-highlight/40 hover:bg-surface-highlight text-secondary hover:text-primary'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vertical Scrollable Menu Items */}
                <div className="flex flex-col space-y-0.5 max-h-[190px] overflow-y-auto no-scrollbar pr-0.5" role="listbox">
                  {filteredSlashCommands.length === 0 ? (
                    <div className="py-4 text-center text-[11px] text-secondary opacity-60">
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
                          className={`flex items-center gap-2.5 w-full p-1.5 rounded-xl text-left transition-all border ${
                            isSelected 
                              ? 'bg-accent/15 border-accent/40 text-accent font-semibold shadow-2xs' 
                              : 'bg-transparent border-transparent hover:bg-surface-highlight text-primary'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 transition-transform ${
                            isSelected ? 'bg-accent text-accent-fg scale-105' : 'bg-accent/10 text-accent'
                          }`}>
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`block text-[11px] font-semibold truncate ${isSelected ? 'text-accent font-bold' : 'text-primary'}`}>
                                {cmd.label}
                              </span>
                              <span className="text-[8px] font-mono text-secondary/50 uppercase tracking-tight shrink-0">{cmd.cat}</span>
                            </div>
                            <span className="block text-[9px] text-secondary truncate opacity-75">{cmd.desc}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Footer Keyboard Shortcuts Legend */}
                <div className="pt-1.5 mt-1.5 border-t border-surface-highlight/50 flex items-center justify-between text-[9px] text-secondary/60 shrink-0 font-mono">
                  <span><kbd className="px-1 py-0.2 rounded bg-surface-highlight border border-surface-highlight">↑↓</kbd> navigate</span>
                  <span><kbd className="px-1 py-0.2 rounded bg-surface-highlight border border-surface-highlight">↵</kbd> select</span>
                  <span><kbd className="px-1 py-0.2 rounded bg-surface-highlight border border-surface-highlight">esc</kbd> close</span>
                </div>

              </motion.div>
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