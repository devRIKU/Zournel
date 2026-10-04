import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { 
  ArrowLeft, Sparkles, Wand2, Save, X, 
  Bold, Italic, List, ListOrdered, Strikethrough, Code, Undo, Redo, 
  ChevronDown, Loader2, Feather, LayoutTemplate, ImageOff, Check, FileText,
  History, CheckCircle, XCircle, Heading1, Heading2, Heading3, Heading4, Quote, Minus,
  MoreHorizontal, CheckCheck, RefreshCw, Maximize2, Shuffle, Command, Search,
  CheckSquare, MessageSquareCode, Table as TableIcon, Lightbulb,
  GripVertical, Plus, Trash2, Copy, ArrowUp, ArrowDown, Pencil, Music, BookOpen
} from './Icons';
import { ScribblePadModal } from './ScribblePadModal';
import { SongAttachmentModal } from './SongAttachmentModal';
import { AttachedSong, JournalEntry } from '../types';
import { Play, Pause, MoreVertical } from './Icons';
import { toggleAudioPreview, subscribeToAudio, stopAudioPreview } from '../services/songService';
import { motion, AnimatePresence } from 'motion/react';
import { iosSpring, triggerHaptic } from '../utils/uiSprings';
import { Editor, rootCtx, defaultValueCtx, commandsCtx, editorViewCtx, serializerCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { 
  commonmark, 
  wrapInHeadingCommand, 
  createCodeBlockCommand,
  insertHrCommand, 
  wrapInBlockquoteCommand,
  toggleStrongCommand, 
  toggleEmphasisCommand, 
  toggleInlineCodeCommand, 
  wrapInBulletListCommand, 
  wrapInOrderedListCommand
} from '@milkdown/preset-commonmark';
import { gfm, toggleStrikethroughCommand, insertTableCommand } from '@milkdown/preset-gfm';
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history';
import { Milkdown, useEditor, MilkdownProvider } from '@milkdown/react';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll } from '@milkdown/utils';
import { editJournalText, detectMoodFromJournal, AiActionType, extractAutoTitle, extractTasksFromJournal, moodFromLabel } from '../services/geminiService';
import { isJevAvailable, detectMoodWithJev } from '../services/jevService';
import { useJournalStore } from '../store/useJournalStore';
import { useTaskStore } from '../store/useTaskStore';
import { AiGlitterTypewriter, AiGlitterPill } from './AiGlitterTypewriter';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

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
  { emoji: '😠', label: 'Tense' },
  { emoji: '🌟', label: 'Radiant' },
  { emoji: '🌱', label: 'Growth' },
  { emoji: '🍵', label: 'Serene' },
  { emoji: '💖', label: 'Loved' },
  { emoji: '🥰', label: 'Warm' },
  { emoji: '🧘', label: 'Mindful' },
  { emoji: '🚀', label: 'Driven' },
  { emoji: '🎨', label: 'Creative' },
  { emoji: '🌿', label: 'Grounded' },
  { emoji: '🌙', label: 'Dreamy' },
  { emoji: '🛋️', label: 'Relaxed' }
];

interface JournalEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    content: string, 
    image: string | undefined, 
    mood?: string, 
    isAutoSave?: boolean, 
    title?: string, 
    scribble?: string, 
    song?: AttachedSong,
    lyrics?: string,
    id?: string,
    linkedEntryIds?: string[],
    linkedTaskIds?: string[]
  ) => void;
  onDelete?: (id: string) => void;
  onSwitchEntry?: (entry: JournalEntry) => void;
  initialContent?: string;
  initialTitle?: string;
  initialImage?: string;
  initialId?: string;
  initialMood?: string;
  initialScribble?: string;
  initialSong?: AttachedSong;
  initialLyrics?: string;
  initialLinkedEntryIds?: string[];
  initialLinkedTaskIds?: string[];
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
  isOpen, onClose, onSave, onDelete, onSwitchEntry, initialContent = '', initialTitle = '', initialImage, initialId, initialMood, initialScribble, initialSong, initialLyrics, initialLinkedEntryIds, initialLinkedTaskIds, selectedModel 
}) => {
  const allEntries = useJournalStore((s) => s.entries);
  const { tasks: allTasks, addTask, toggleTask } = useTaskStore();
  const [content, setContent] = useState(() => initialContent);
  const initialContentRef = useRef<string>(initialContent || '');
  // Titles are inferred from the writing. Keep a pre-existing custom title stable,
  // but do not make the editor itself another place to manage it.
  const initialTitleIsCustomRef = useRef<boolean>(Boolean(initialTitle && initialTitle.trim() !== extractAutoTitle(initialContent || '')));
  const [image, setImage] = useState<string>(() => initialImage || getRandomCover());
  const handleRandomCover = () => setImage(getRandomCover());
  const [mood, setMood] = useState<string | undefined>(() => initialMood);
  const [scribble, setScribble] = useState<string | undefined>(() => initialScribble);
  const [song, setSong] = useState<AttachedSong | undefined>(() => initialSong);
  const [lyrics, setLyrics] = useState<string | undefined>(() => initialLyrics || initialSong?.lyrics);
  const [linkedEntryIds, setLinkedEntryIds] = useState<string[]>(() => initialLinkedEntryIds || []);
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>(() => initialLinkedTaskIds || []);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionTab, setMentionTab] = useState<'memories' | 'tasks'>('memories');
  const [mentionQuery, setMentionQuery] = useState('');
  const [isExtractingTasks, setIsExtractingTasks] = useState(false);
  const mentionMenuRef = useRef<HTMLDivElement>(null);
  const [playingPreviewUrl, setPlayingPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToAudio((isPlaying, url) => {
      setPlayingPreviewUrl(isPlaying ? url : null);
    });
  }, []);
  const [showScribbleModal, setShowScribbleModal] = useState(false);
  const [showSongModal, setShowSongModal] = useState(false);
  const [showMoodMenu, setShowMoodMenu] = useState(false);
  const [customMoodInput, setCustomMoodInput] = useState('');
  const [storedCustomMoods, setStoredCustomMoods] = useState<{ emoji: string; label: string }[]>(() => {
    try {
      const saved = localStorage.getItem('mf_custom_moods');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [showManageMoods, setShowManageMoods] = useState(false);
  const [newMoodEmoji, setNewMoodEmoji] = useState('✨');
  const [newMoodLabel, setNewMoodLabel] = useState('');

  const handleAddCustomMoodStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMoodLabel.trim()) return;
    const emoji = newMoodEmoji.trim() || '✨';
    const label = newMoodLabel.trim();
    if (storedCustomMoods.some(m => m.label.toLowerCase() === label.toLowerCase())) return;
    const updated = [...storedCustomMoods, { emoji, label }];
    setStoredCustomMoods(updated);
    try {
      localStorage.setItem('mf_custom_moods', JSON.stringify(updated));
    } catch (err) {}
    setNewMoodLabel('');
    setShowManageMoods(false);
  };

  const handleRemoveCustomMoodStore = (label: string) => {
    const updated = storedCustomMoods.filter(m => m.label !== label);
    setStoredCustomMoods(updated);
    try {
      localStorage.setItem('mf_custom_moods', JSON.stringify(updated));
    } catch (err) {}
  };
  const [isAutoDetectingMood, setIsAutoDetectingMood] = useState(false);
  const [autoMoodActive, setAutoMoodActive] = useState<boolean>(() => initialMood === '✨ Auto');

  // Predictive mood: while the user writes (and hasn't picked a mood), Jev quietly scores the
  // text. Debounced + cached in jevService, so a long session costs a handful of tiny requests.
  const [predictedMood, setPredictedMood] = useState<{ emoji: string; label: string; fullMood: string } | null>(null);
  useEffect(() => {
    if ((mood && !autoMoodActive) || !isJevAvailable() || content.trim().length < 40) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      detectMoodWithJev(content, ctrl.signal).then(res => {
        if (!ctrl.signal.aborted && res && res.confidence >= 0.35) setPredictedMood(moodFromLabel(res.label));
      });
    }, 1500);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [content, mood, autoMoodActive]);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showToolbarMore, setShowToolbarMore] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [aiTargetText, setAiTargetText] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null);
  const slashTriggerRef = useRef<{ from: number | null; to: number | null; query: string } | null>(null);

  // Auto-Save state & refs
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef<boolean>(true);
  const currentIdRef = useRef<string>(
    initialId || (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
  );

  // Top header & toolbar menus
  const [showPlusDropdown, setShowPlusDropdown] = useState(false);
  const [showKebabDropdown, setShowKebabDropdown] = useState(false);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const kebabMenuRef = useRef<HTMLDivElement>(null);
  const moodMenuRef = useRef<HTMLDivElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const blockMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMenuClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (plusMenuRef.current && !plusMenuRef.current.contains(target)) {
        setShowPlusDropdown(false);
      }
      if (kebabMenuRef.current && !kebabMenuRef.current.contains(target)) {
        setShowKebabDropdown(false);
      }
      if (moodMenuRef.current && !moodMenuRef.current.contains(target)) {
        setShowMoodMenu(false);
      }
      if (aiMenuRef.current && !aiMenuRef.current.contains(target)) {
        setShowAiMenu(false);
      }
      if (blockMenuRef.current && !blockMenuRef.current.contains(target)) {
        setShowBlockMenu(false);
      }
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(target)) {
        setShowMentionDropdown(false);
      }
    };
    document.addEventListener('pointerdown', handleMenuClickOutside);
    return () => document.removeEventListener('pointerdown', handleMenuClickOutside);
  }, []);

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

  const getCurrentSlashTrigger = useCallback((markdown: string) => {
    let trigger: { from: number | null; to: number | null; query: string } | null = null;
    let selectionIsInEditor = false;

    try {
      editorRef.current?.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const domSelection = window.getSelection();
        const anchorNode = domSelection?.anchorNode;
        selectionIsInEditor = Boolean((anchorNode && view.dom.contains(anchorNode)) || view.hasFocus());
        const { selection } = view.state;
        if (!selectionIsInEditor || !selection.empty) return;

        const blockStart = selection.$from.start();
        const beforeCursor = view.state.doc.textBetween(blockStart, selection.from, '\n');
        const match = beforeCursor.match(/(?:^|\s)\/([a-zA-Z0-9_-]{0,18})$/);
        if (!match) return;

        trigger = {
          from: blockStart + beforeCursor.lastIndexOf('/'),
          to: selection.from,
          query: match[1],
        };
      });
    } catch {
      // The editor view may still be mounting; fall back to the serialized final line.
    }

    if (selectionIsInEditor) return trigger;

    const normalized = markdown.replace(/(?:\r?\n)+$/, '');
    const currentLine = normalized.slice(normalized.lastIndexOf('\n') + 1);
    const fallbackMatch = currentLine.match(/(?:^|\s)\/([a-zA-Z0-9_-]{0,18})$/);
    return fallbackMatch ? { from: null, to: null, query: fallbackMatch[1] } : null;
  }, []);

  const updateSlashMenuPosition = useCallback(() => {
    let caret: { top: number; bottom: number; left: number } | null = null;

    try {
      if (editorRef.current) {
        caret = editorRef.current.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const coords = view.coordsAtPos(view.state.selection.from);
          return { top: coords.top, bottom: coords.bottom, left: coords.left };
        });
      }
    } catch {
      // Use the browser selection below if ProseMirror cannot provide caret coordinates yet.
    }

    if (!caret) {
      const selection = window.getSelection();
      if (selection?.rangeCount) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        if (rect.top || rect.bottom || rect.left) {
          caret = { top: rect.top, bottom: rect.bottom || rect.top + 20, left: rect.left };
        }
      }
    }
    if (!caret) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = Math.min(310, Math.max(260, viewportWidth - 24));
    const menuHeight = Math.min(320, Math.max(180, viewportHeight - 24));
    let left = caret.left;
    let top = caret.bottom + 8;

    if (left + menuWidth > viewportWidth - 12) left = viewportWidth - menuWidth - 12;
    if (top + menuHeight > viewportHeight - 12) top = caret.top - menuHeight - 8;
    left = Math.max(12, left);
    top = Math.max(12, Math.min(top, viewportHeight - menuHeight - 12));

    setSlashMenuPos({ top, left });
  }, []);

  useEffect(() => {
    if (!showSlashMenu) return;
    const reposition = () => updateSlashMenuPosition();
    const container = editorContainerRef.current;
    window.addEventListener('resize', reposition);
    container?.addEventListener('scroll', reposition, { passive: true });
    return () => {
      window.removeEventListener('resize', reposition);
      container?.removeEventListener('scroll', reposition);
    };
  }, [showSlashMenu, updateSlashMenuPosition]);

  useEffect(() => {
    if (isOpen) {
      isInitialMountRef.current = true;
      currentIdRef.current = initialId || (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
      setSaveStatus(null);
      setContent(initialContent || '');
      initialContentRef.current = initialContent || '';
      initialTitleIsCustomRef.current = Boolean(initialTitle && initialTitle.trim() !== extractAutoTitle(initialContent || ''));
      setImage(initialImage || getRandomCover());
      setMood(initialMood);
      setScribble(initialScribble);
      setSong(initialSong);
      setLinkedEntryIds(initialLinkedEntryIds || []);
      setLinkedTaskIds(initialLinkedTaskIds || []);
      setShowMentionDropdown(false);
      setMentionQuery('');
      setShowScribbleModal(false);
      setShowSongModal(false);
      setShowPlusDropdown(false);
      setShowKebabDropdown(false);
      setShowDeleteConfirm(false);
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
  }, [isOpen, initialId, initialContent, initialTitle, initialImage, initialMood, initialScribble, initialSong, initialLinkedEntryIds, initialLinkedTaskIds]);

  // Debounced Auto-Save Effect
  useEffect(() => {
    if (!isOpen) return;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (!content.trim() && linkedEntryIds.length === 0 && linkedTaskIds.length === 0) return;

    setSaveStatus('unsaved');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      const activeTitle = initialTitle?.trim() || extractAutoTitle(content);
      onSave(content, image, mood, true, activeTitle, scribble, song, lyrics || song?.lyrics, currentIdRef.current, linkedEntryIds, linkedTaskIds);
      setTimeout(() => {
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 300);
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [content, image, mood, initialTitle, scribble, song, linkedEntryIds, linkedTaskIds, isOpen, onSave]);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  const handleMarkdownUpdate = useCallback((md: string) => {
    setContent(md);

    // Read the active ProseMirror text block and caret, rather than assuming the
    // command is at the end of serialized Markdown (which may have trailing newlines).
    const trigger = getCurrentSlashTrigger(md);
    slashTriggerRef.current = trigger;
    if (trigger) {
      setShowSlashMenu(true);
      setShowPlusDropdown(false);
      setShowKebabDropdown(false);
      setShowMoodMenu(false);
      setShowAiMenu(false);
      setSlashQuery(trigger.query.toLowerCase());
      requestAnimationFrame(() => updateSlashMenuPosition());
    } else {
      setShowSlashMenu(false);
      setSlashQuery('');
    }
  }, [getCurrentSlashTrigger, updateSlashMenuPosition]);

  const updateActiveStates = useCallback((editor: Editor) => {
  }, []);

  const callCommand = (command: any, payload?: any) => {
    editorRef.current?.action((ctx) => ctx.get(commandsCtx).call(command, payload));
    // Close mobile menu after selection if open
    if (showToolbarMore) setShowToolbarMore(false);
  };

  const getCleanedContent = (raw: string) => {
    const trailingLineBreaks = raw.match(/(?:\r?\n)*$/)?.[0] || '';
    const body = trailingLineBreaks ? raw.slice(0, -trailingLineBreaks.length) : raw;
    const match = body.match(/(?:^|\n|\s)\/([a-zA-Z0-9_-]*)$/);
    if (!match) return raw;
    const matchIdx = match.index!;
    const leadingChar = match[0].charAt(0);
    const keepLeading = leadingChar === '\n' || leadingChar === ' ';
    return body.slice(0, matchIdx + (keepLeading ? 1 : 0)) + trailingLineBreaks;
  };

  const removeSlashTriggerFromEditor = (trigger: { from: number | null; to: number | null; query: string } | null) => {
    if (!editorRef.current) {
      const cleaned = getCleanedContent(content);
      setContent(cleaned);
      return cleaned;
    }

    const markdown = editorRef.current.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      if (trigger?.from !== null && trigger?.from !== undefined && trigger.to !== null) {
        const docEnd = view.state.doc.content.size;
        const from = Math.max(0, Math.min(trigger.from, docEnd));
        const to = Math.max(from, Math.min(trigger.to, docEnd));
        if (to > from) view.dispatch(view.state.tr.delete(from, to));
      }
      return ctx.get(serializerCtx)(view.state.doc);
    });

    const cleaned = trigger?.from === null ? getCleanedContent(markdown) : markdown;
    if (cleaned !== markdown) editorRef.current.action(replaceAll(cleaned));
    setContent(cleaned);
    return cleaned;
  };

  const handleAiAction = async (type: AiActionType, explicitText?: string) => {
    const textToProcess = explicitText !== undefined ? explicitText : content;
    if (!editorRef.current || !textToProcess.trim()) return;
    setIsProcessing(true);
    setShowAiMenu(false);
    try {
      const result = await editJournalText(textToProcess, type, selectedModel);
      if (result && result !== textToProcess) {
        setAiTargetText(explicitText !== undefined ? explicitText : null);
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

    const trigger = slashTriggerRef.current;
    slashTriggerRef.current = null;
    const clean = removeSlashTriggerFromEditor(trigger);

    const nativeStyleCommands: Record<string, { key: any; payload?: any }> = {
      h1: { key: wrapInHeadingCommand.key, payload: 1 },
      h2: { key: wrapInHeadingCommand.key, payload: 2 },
      h3: { key: wrapInHeadingCommand.key, payload: 3 },
      h4: { key: wrapInHeadingCommand.key, payload: 4 },
      bullet: { key: wrapInBulletListCommand.key },
      number: { key: wrapInOrderedListCommand.key },
      quote: { key: wrapInBlockquoteCommand.key },
      code: { key: createCodeBlockCommand.key },
      table: { key: insertTableCommand.key, payload: { row: 3, col: 2 } },
      hr: { key: insertHrCommand.key },
    };
    const nativeCommand = nativeStyleCommands[cmdId];

    // Apply block transforms against Milkdown's live selection. This keeps commands
    // working at the caret instead of replacing the whole document and losing context.
    if (nativeCommand && trigger?.from !== null && trigger?.from !== undefined && editorRef.current) {
      const updatedMarkdown = editorRef.current.action((ctx) => {
        ctx.get(commandsCtx).call(nativeCommand.key, nativeCommand.payload);
        const view = ctx.get(editorViewCtx);
        return ctx.get(serializerCtx)(view.state.doc);
      });
      setContent(updatedMarkdown);
      return;
    }

    if ((cmdId === 'todo' || cmdId === 'callout') && trigger?.from !== null && trigger?.from !== undefined && editorRef.current) {
      const updatedMarkdown = editorRef.current.action((ctx) => {
        let view = ctx.get(editorViewCtx);
        if (cmdId === 'callout') {
          const blockStart = view.state.selection.$from.start();
          view.dispatch(view.state.tr.insertText('💡 Note: ', blockStart));
          ctx.get(commandsCtx).call(wrapInBlockquoteCommand.key);
        } else {
          ctx.get(commandsCtx).call(wrapInBulletListCommand.key);
          view = ctx.get(editorViewCtx);
          const { $from } = view.state.selection;
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth);
            if (node.type.name === 'list_item') {
              const itemPosition = $from.before(depth);
              view.dispatch(view.state.tr.setNodeMarkup(itemPosition, undefined, { ...node.attrs, checked: false }));
              break;
            }
          }
        }
        return ctx.get(serializerCtx)(view.state.doc);
      });
      setContent(updatedMarkdown);
      return;
    }

    const aiCommandMap: Record<string, AiActionType> = {
      proofread: 'PROOFREAD',
      rewrite: 'REWRITE',
      improve: 'IMPROVE',
      poetic: 'REPHRASE',
      summarize: 'SUMMARIZE',
      expand: 'EXPAND',
    };

    const customStylingIds = ['todo', 'callout'];
    if (customStylingIds.includes(cmdId)) {
      const lines = clean.split('\n');
      let targetIdx = lines.length - 1;
      while (targetIdx > 0 && !lines[targetIdx].trim()) targetIdx -= 1;
      const originalText = lines[targetIdx] || '';
      const strippedText = originalText.replace(/^[#*>\-\d.\s]+/, '').trim();

      if (cmdId === 'todo') {
        lines[targetIdx] = `- [ ] ${strippedText || 'New task'}`;
      } else {
        lines[targetIdx] = `> 💡 **Note:** ${strippedText || 'Important highlight'}`;
      }

      const updatedMarkdown = lines.join('\n');
      if (editorRef.current) editorRef.current.action(replaceAll(updatedMarkdown));
      setContent(updatedMarkdown);
      return;
    }

    if (cmdId in aiCommandMap) {
      if (editorRef.current) editorRef.current.action(replaceAll(clean));
      setContent(clean);
      handleAiAction(aiCommandMap[cmdId], clean);
    } else if (cmdId === 'random') {
      if (editorRef.current) editorRef.current.action(replaceAll(clean));
      setContent(clean);
      handleRandomCover();
    } else if (cmdId === 'music') {
      if (editorRef.current) editorRef.current.action(replaceAll(clean));
      setContent(clean);
      setShowSongModal(true);
    } else if (cmdId === 'scribble') {
      if (editorRef.current) editorRef.current.action(replaceAll(clean));
      setContent(clean);
      setShowScribbleModal(true);
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
    { id: 'music', label: 'Soundtrack & Lyrics', desc: 'Attach song, audio preview & lyrics', cat: 'Media', icon: Music, keywords: ['music', 'song', 'audio', 'soundtrack', 'lyrics', 'itunes', 'track'] },
    { id: 'scribble', label: 'Hand-drawn Scribble', desc: 'Draw a sketch or doodle', cat: 'Media', icon: Pencil, keywords: ['scribble', 'draw', 'sketch', 'doodle', 'pencil'] },
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
      if (aiTargetText !== null) {
        const newContent = content.replace(aiTargetText, previewText);
        editorRef.current.action(replaceAll(newContent));
        setContent(newContent);
      } else {
        editorRef.current.action(replaceAll(previewText));
        setContent(previewText);
      }
      setPreviewText(null);
      setAiTargetText(null);
    }
  };

  const discardAiPreview = () => {
    setPreviewText(null);
    setAiTargetText(null);
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

  const isMeaningfulContentChange = (prevText: string, currentText: string): boolean => {
    const prev = prevText.trim();
    const curr = currentText.trim();
    if (prev === curr) return false;

    const prevWords = prev ? prev.split(/\s+/).filter(Boolean).length : 0;
    const currWords = curr ? curr.split(/\s+/).filter(Boolean).length : 0;

    // Brand new entry: meaningful if at least 3 words and 12 characters
    if (prevWords === 0) {
      return currWords >= 3 && curr.length >= 12;
    }

    const wordDiff = Math.abs(currWords - prevWords);
    const charDiff = Math.abs(curr.length - prev.length);

    // Meaningful addition or removal: at least 4 words or 20 characters changed
    return wordDiff >= 4 || charDiff >= 20;
  };

  const handleExitAndSave = async () => {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(20); } catch (e) {}
    }
    let finalMood = mood;
    if (autoMoodActive || mood === '✨ Auto') {
      if (predictedMood) {
        finalMood = predictedMood.fullMood;
        setMood(finalMood);
      } else if (content && content.trim().length >= 5) {
        setIsAutoDetectingMood(true);
        try {
          const autoRes = await detectMoodFromJournal(content, selectedModel);
          if (autoRes?.fullMood) {
            finalMood = autoRes.fullMood;
            setMood(finalMood);
          }
        } catch (e) {
          console.warn('Auto mood detection skipped', e);
        } finally {
          setIsAutoDetectingMood(false);
        }
      }
    }
    const finalTitle = initialTitle?.trim() || extractAutoTitle(content);
    const currentId = currentIdRef.current;
    const meaningfulChange = isMeaningfulContentChange(initialContentRef.current, content);
    const hasCustomTitle = initialTitleIsCustomRef.current;

    onSave(content, image, finalMood, false, finalTitle, scribble, song, lyrics || song?.lyrics, currentId, linkedEntryIds, linkedTaskIds);
    onClose();

    // Let the writing supply its title. Existing custom titles stay intact;
    // new or auto-titled memories can receive a more thoughtful title on exit.
    if (meaningfulChange && !hasCustomTitle && content.trim().length >= 10) {
      setTimeout(() => {
        useJournalStore.getState().generateAiTitleForEntry(currentId, selectedModel);
      }, 50);
    }
  };

  const toggleLinkEntry = (targetEntryId: string) => {
    triggerHaptic(8);
    setLinkedEntryIds((prev) =>
      prev.includes(targetEntryId)
        ? prev.filter((id) => id !== targetEntryId)
        : [...prev, targetEntryId]
    );
  };

  const toggleLinkTask = (targetTaskId: string) => {
    triggerHaptic(8);
    setLinkedTaskIds((prev) =>
      prev.includes(targetTaskId)
        ? prev.filter((id) => id !== targetTaskId)
        : [...prev, targetTaskId]
    );
  };

  const handleCreateAndLinkTask = (taskTitle: string) => {
    const clean = taskTitle.trim();
    if (!clean) return;
    triggerHaptic(12);
    const newTaskId = addTask(clean, 'medium', currentIdRef.current);
    setLinkedTaskIds((prev) => (prev.includes(newTaskId) ? prev : [...prev, newTaskId]));
    setMentionQuery('');
  };

  const handleExtractTasksFromEntry = async () => {
    if (!content.trim() || isExtractingTasks) return;
    setIsExtractingTasks(true);
    triggerHaptic(10);
    try {
      const extracted = await extractTasksFromJournal(content, selectedModel);
      if (extracted.length > 0) {
        const createdIds: string[] = [];
        for (const item of extracted) {
          if (item.text.trim()) {
            const id = addTask(item.text.trim(), item.priority, currentIdRef.current);
            createdIds.push(id);
          }
        }
        if (createdIds.length > 0) {
          setLinkedTaskIds((prev) => Array.from(new Set([...prev, ...createdIds])));
        }
      }
    } catch (e) {
      console.error('Task extraction failed', e);
    } finally {
      setIsExtractingTasks(false);
    }
  };

  const handleNavigateToLinkedEntry = (targetEntry: JournalEntry) => {
    if (!onSwitchEntry) return;
    triggerHaptic(12);
    const activeTitle = initialTitle?.trim() || extractAutoTitle(content);
    onSave(
      content,
      image,
      mood,
      true,
      activeTitle,
      scribble,
      song,
      lyrics || song?.lyrics,
      currentIdRef.current,
      linkedEntryIds,
      linkedTaskIds
    );
    onSwitchEntry(targetEntry);
  };

  const linkableMemories = allEntries.filter((e) => e.id !== currentIdRef.current);
  const filteredMentionMemories = linkableMemories.filter((e) => {
    const q = mentionQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (e.title || '').toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q)
    );
  });
  const filteredMentionTasks = allTasks.filter((t) => {
    const q = mentionQuery.trim().toLowerCase();
    if (!q) return true;
    return t.text.toLowerCase().includes(q);
  });

  return (
    <>
      <AnimatePresence>
        {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 35, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 35, scale: 0.99 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="journal-editor-shell fixed inset-0 z-[100] bg-bg flex flex-col overflow-hidden"
        >
          {/* Cover Image Header — outer wrapper has z-[60] and NO overflow-hidden so Plus & Kebab menus never clip or fall behind the editor toolbar */}
          <div className={`relative ${image ? 'h-32 sm:h-44 md:h-56' : 'h-20 sm:h-24'} w-full shrink-0 group bg-surface-highlight z-[60] transition-all duration-300`}>
            {/* Clipped background layer */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {image ? (
                <>
                  {imgLoading && (
                    <div className="absolute inset-0 bg-surface-highlight animate-pulse flex items-center justify-center z-0">
                      <Loader2 className="w-8 h-8 text-accent animate-spin opacity-50" />
                    </div>
                  )}
                  {imgError && (
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-surface-highlight flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-secondary/50">
                        <ImageOff className="w-6 h-6" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Image unavailable</span>
                      </div>
                    </div>
                  )}

                  <img 
                    src={image} 
                    alt="Cover" 
                    onLoad={() => setImgLoading(false)}
                    onError={() => { setImgError(true); setImgLoading(false); }}
                    className={`w-full h-full object-cover transition duration-700 ${imgLoading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`} 
                  />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent/25 via-surface-highlight to-bg flex items-center justify-center opacity-75" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/20 to-bg" />
            </div>

            {/* Top Action Bar — z-[70] sits above both the cover image and the z-20/z-40 editor toolbar below */}
            <div className="relative z-[70] w-full px-3.5 py-3 sm:px-6 sm:py-4 pt-[calc(env(safe-area-inset-top,0px)+0.65rem)] flex justify-between items-center text-white">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleExitAndSave}
                  className="editor-touch-target w-11 h-11 bg-black/35 hover:bg-black/55 border border-white/15 backdrop-blur-md rounded-full flex items-center justify-center transition active:scale-95 shrink-0"
                  title="Save & Back"
                  aria-label="Save & Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {/* Auto-Save Status Indicator — visible on both mobile and desktop */}
                {saveStatus && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-black/45 backdrop-blur-md border border-white/15 rounded-full text-[10px] sm:text-[11px] font-mono tracking-wide truncate">
                    {saveStatus === 'saving' && (
                      <>
                        <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent animate-spin shrink-0" />
                        <span className="text-white/90">Saving…</span>
                      </>
                    )}
                    {saveStatus === 'saved' && (
                      <>
                        <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-emerald-200 truncate">
                          <span className="sm:hidden">Saved</span>
                          <span className="hidden sm:inline">Auto-saved {lastSavedTime ? `at ${lastSavedTime}` : ''}</span>
                        </span>
                      </>
                    )}
                    {saveStatus === 'unsaved' && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <span className="text-amber-200">Editing…</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                {/* 0. @ Mention Button with Bidirectional Memory & Task Picker */}
                <div className="relative" ref={mentionMenuRef}>
                  <button
                    type="button"
                    aria-expanded={showMentionDropdown}
                    aria-haspopup="dialog"
                    onClick={() => {
                      setShowMentionDropdown((prev) => !prev);
                      setShowPlusDropdown(false);
                      setShowKebabDropdown(false);
                      setShowMoodMenu(false);
                      setShowAiMenu(false);
                      setShowSlashMenu(false);
                    }}
                    className={`editor-touch-target h-11 px-3 backdrop-blur-md rounded-full transition active:scale-95 border flex items-center justify-center gap-1.5 text-xs font-mono font-bold ${
                      showMentionDropdown
                        ? 'bg-accent text-accent-fg border-accent shadow-lg ring-2 ring-accent/30'
                        : linkedEntryIds.length + linkedTaskIds.length > 0
                          ? 'bg-black/45 text-white border-accent/60'
                          : 'bg-black/35 hover:bg-black/55 text-white border-white/15'
                    }`}
                    title="Bidirectional Mentions (@Memory & Tasks)"
                    aria-label="Mention a Memory or Task"
                  >
                    <span className="text-sm font-bold leading-none">@</span>
                    {linkedEntryIds.length + linkedTaskIds.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/25 text-accent font-mono font-bold leading-none">
                        {linkedEntryIds.length + linkedTaskIds.length}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showMentionDropdown && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 6 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-surface/98 backdrop-blur-2xl border border-surface-highlight rounded-2xl shadow-2xl p-2.5 z-[95] flex flex-col gap-2 text-left"
                      >
                        {/* Segmented Tabs: Memories vs Tasks */}
                        <div className="flex items-center justify-between gap-1 bg-surface-highlight/60 p-1 rounded-xl border border-surface-highlight">
                          <button
                            type="button"
                            onClick={() => setMentionTab('memories')}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                              mentionTab === 'memories'
                                ? 'bg-surface text-primary shadow-xs'
                                : 'text-secondary hover:text-primary'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5 text-accent" />
                            <span>Memories ({linkedEntryIds.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMentionTab('tasks')}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                              mentionTab === 'tasks'
                                ? 'bg-surface text-primary shadow-xs'
                                : 'text-secondary hover:text-primary'
                            }`}
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-accent" />
                            <span>Tasks ({linkedTaskIds.length})</span>
                          </button>
                        </div>

                        {/* Search / Filter or Create Input */}
                        <div className="relative">
                          <input
                            type="text"
                            value={mentionQuery}
                            onChange={(e) => setMentionQuery(e.target.value)}
                            placeholder={
                              mentionTab === 'memories'
                                ? 'Search memories to link (@)…'
                                : 'Search or create a task to link…'
                            }
                            className="w-full px-3 py-2 rounded-xl bg-bg/80 border border-surface-highlight text-xs text-primary placeholder:text-secondary/50 focus:outline-none focus:border-accent"
                          />
                          {mentionQuery && (
                            <button
                              type="button"
                              onClick={() => setMentionQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {mentionTab === 'memories' ? (
                          <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                            {filteredMentionMemories.length === 0 ? (
                              <div className="py-6 text-center text-[11px] text-secondary/70 font-mono">
                                {linkableMemories.length === 0
                                  ? 'No other memories yet to link'
                                  : 'No matching memories found'}
                              </div>
                            ) : (
                              filteredMentionMemories.map((entry) => {
                                const isLinked = linkedEntryIds.includes(entry.id);
                                const entryTitle =
                                  entry.title?.trim() || extractAutoTitle(entry.content) || 'Untitled Memory';
                                return (
                                  <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => toggleLinkEntry(entry.id)}
                                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition ${
                                      isLinked
                                        ? 'bg-accent/15 border border-accent/30 text-primary'
                                        : 'hover:bg-surface-highlight text-primary border border-transparent'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        {entry.mood && (
                                          <span className="text-xs shrink-0">
                                            {entry.mood.split(' ')[0]}
                                          </span>
                                        )}
                                        <span className="text-xs font-semibold truncate">
                                          {entryTitle}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-secondary truncate mt-0.5 font-mono">
                                        {new Date(entry.createdAt).toLocaleDateString(undefined, {
                                          month: 'short',
                                          day: 'numeric',
                                        })}{' '}
                                        • {entry.content.replace(/[#*`>_~-]/g, '').slice(0, 48)}
                                      </p>
                                    </div>
                                    <span
                                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                        isLinked
                                          ? 'bg-accent text-accent-fg'
                                          : 'bg-surface-highlight text-secondary'
                                      }`}
                                    >
                                      {isLinked ? 'Linked ↔' : 'Link'}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {/* Quick Create & Link Task */}
                            {mentionQuery.trim().length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleCreateAndLinkTask(mentionQuery)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-xs font-semibold transition"
                              >
                                <span className="truncate">+ Create & link "{mentionQuery.trim()}"</span>
                                <span className="text-[10px] font-mono uppercase tracking-wider shrink-0 ml-2">
                                  New Task
                                </span>
                              </button>
                            )}

                            {/* AI Extract Actionable Tasks from Current Entry */}
                            {content.trim().length > 15 && (
                              <button
                                type="button"
                                onClick={handleExtractTasksFromEntry}
                                disabled={isExtractingTasks}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface-highlight/70 hover:bg-surface-highlight border border-surface-highlight text-primary text-xs font-semibold transition disabled:opacity-50"
                              >
                                <span className="flex items-center gap-1.5">
                                  {isExtractingTasks ? (
                                    <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                                  )}
                                  <span>
                                    {isExtractingTasks
                                      ? 'Extracting tasks…'
                                      : 'Extract Tasks from Entry with AI'}
                                  </span>
                                </span>
                                <span className="text-[9px] font-mono uppercase tracking-wider text-accent">
                                  Auto-Link
                                </span>
                              </button>
                            )}

                            <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                              {filteredMentionTasks.length === 0 ? (
                                <div className="py-5 text-center text-[11px] text-secondary/70 font-mono">
                                  Type above to create & link a task
                                </div>
                              ) : (
                                filteredMentionTasks.map((t) => {
                                  const isLinked = linkedTaskIds.includes(t.id);
                                  return (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => toggleLinkTask(t.id)}
                                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition ${
                                        isLinked
                                          ? 'bg-accent/15 border border-accent/30 text-primary'
                                          : 'hover:bg-surface-highlight text-primary border border-transparent'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span
                                          className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] shrink-0 border ${
                                            t.completed
                                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500'
                                              : 'border-secondary/40 text-transparent'
                                          }`}
                                        >
                                          ✓
                                        </span>
                                        <span
                                          className={`text-xs font-medium truncate ${
                                            t.completed ? 'line-through text-secondary' : ''
                                          }`}
                                        >
                                          {t.text}
                                        </span>
                                      </div>
                                      <span
                                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                          isLinked
                                            ? 'bg-accent text-accent-fg'
                                            : 'bg-surface-highlight text-secondary'
                                        }`}
                                      >
                                        {isLinked ? 'Linked ↔' : 'Link'}
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 1. Plus Button with Dropdown (Scribbles, Song, Cover) */}
                <div className="relative" ref={plusMenuRef}>
                  <button
                    type="button"
                    aria-expanded={showPlusDropdown}
                    aria-haspopup="menu"
                    onClick={() => {
                      setShowPlusDropdown((prev) => !prev);
                      setShowMentionDropdown(false);
                      setShowKebabDropdown(false);
                      setShowMoodMenu(false);
                      setShowAiMenu(false);
                      setShowSlashMenu(false);
                    }}
                    className={`editor-touch-target w-11 h-11 backdrop-blur-md rounded-full transition active:scale-95 border flex items-center justify-center ${
                      showPlusDropdown
                        ? 'bg-accent text-accent-fg border-accent shadow-lg ring-2 ring-accent/30'
                        : (scribble || song)
                          ? 'bg-black/45 text-white border-accent/60'
                          : 'bg-black/35 hover:bg-black/55 text-white border-white/15'
                    }`}
                    title="Add media (Scribbles, Song, Cover)"
                    aria-label="Add media"
                  >
                    <Plus className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {showPlusDropdown && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 6 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        role="menu"
                        className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-1.5rem)] bg-surface/98 backdrop-blur-2xl border border-surface-highlight rounded-2xl shadow-2xl p-1.5 z-[90] flex flex-col gap-1 text-left"
                      >
                        <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-secondary/70">
                          Attach to Memory
                        </div>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowPlusDropdown(false);
                            setShowScribbleModal(true);
                          }}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-surface-highlight text-primary text-xs font-semibold transition text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <Pencil className="w-4 h-4 text-accent" />
                            <span>Hand-drawn Scribble</span>
                          </div>
                          {scribble && (
                            <span className="text-[10px] font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Attached
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowPlusDropdown(false);
                            setShowSongModal(true);
                          }}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-surface-highlight text-primary text-xs font-semibold transition text-left"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Music className="w-4 h-4 text-accent shrink-0" />
                            <span className="truncate">{song ? song.title : 'Song & Soundtrack'}</span>
                          </div>
                          {song && (
                            <span className="text-[10px] font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ml-1">
                              Attached
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowPlusDropdown(false);
                            setShowGallery(true);
                          }}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-surface-highlight text-primary text-xs font-semibold transition text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <LayoutTemplate className="w-4 h-4 text-accent" />
                            <span>Cover Photo Gallery</span>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. Kebab Menu (3-dot vertical) right next to it */}
                <div className="relative" ref={kebabMenuRef}>
                  <button
                    type="button"
                    aria-expanded={showKebabDropdown}
                    aria-haspopup="menu"
                    onClick={() => {
                      setShowKebabDropdown((prev) => !prev);
                      setShowPlusDropdown(false);
                      setShowMoodMenu(false);
                      setShowAiMenu(false);
                      setShowSlashMenu(false);
                    }}
                    className={`editor-touch-target w-11 h-11 backdrop-blur-md rounded-full transition active:scale-95 border flex items-center justify-center ${
                      showKebabDropdown
                        ? 'bg-accent text-accent-fg border-accent shadow-lg ring-2 ring-accent/30'
                        : 'bg-black/35 hover:bg-black/55 text-white border-white/15'
                    }`}
                    title="Options (Save, Gallery, Delete)"
                    aria-label="Entry options"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {showKebabDropdown && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 6 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        role="menu"
                        className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-1.5rem)] bg-surface/98 backdrop-blur-2xl border border-surface-highlight rounded-2xl shadow-2xl p-1.5 z-[90] flex flex-col gap-1 text-left"
                      >
                        <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-secondary/70">
                          Memory Options
                        </div>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowKebabDropdown(false);
                            handleExitAndSave();
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl hover:bg-accent/15 text-accent text-xs font-bold transition text-left"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save &amp; Close Memory</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowKebabDropdown(false);
                            setShowGallery(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl hover:bg-surface-highlight text-primary text-xs font-semibold transition text-left"
                        >
                          <LayoutTemplate className="w-4 h-4 text-secondary" />
                          <span>{image ? 'Change Cover (Gallery)' : 'Add Cover (Gallery)'}</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowKebabDropdown(false);
                            handleRandomCover();
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl hover:bg-surface-highlight text-primary text-xs font-semibold transition text-left"
                        >
                          <Shuffle className="w-4 h-4 text-secondary" />
                          <span>Shuffle Random Cover</span>
                        </button>

                        {image && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setShowKebabDropdown(false);
                              setImage('');
                              setImgError(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl hover:bg-surface-highlight text-secondary hover:text-primary text-xs font-semibold transition text-left"
                          >
                            <ImageOff className="w-4 h-4 text-secondary" />
                            <span>Remove Cover Photo</span>
                          </button>
                        )}

                        {onDelete && (
                          <>
                            <div className="h-px bg-surface-highlight/70 my-1"></div>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                if (showDeleteConfirm) {
                                  setShowKebabDropdown(false);
                                  onDelete(currentIdRef.current);
                                  onClose();
                                } else {
                                  setShowDeleteConfirm(true);
                                  setTimeout(() => setShowDeleteConfirm(false), 4000);
                                }
                              }}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                                showDeleteConfirm
                                  ? 'bg-red-600 text-white'
                                  : 'hover:bg-red-500/15 text-red-500 hover:text-red-600'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Trash2 className="w-4 h-4" />
                                <span>{showDeleteConfirm ? 'Tap Again to Delete' : 'Delete Memory'}</span>
                              </div>
                              {showDeleteConfirm && (
                                <span className="text-[10px] font-bold uppercase tracking-wider">Confirm</span>
                              )}
                            </button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Direct Save Button */}
                <Button onClick={handleExitAndSave} size="sm" className="editor-touch-target h-11 gap-1.5 px-4 sm:px-5 rounded-full text-sm font-semibold shadow-lg">
                  <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Done</span>
                </Button>
              </div>
            </div>

        {/* Gallery Modal */}
        <AnimatePresence>
          {showGallery && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                className="bg-surface rounded-3xl md:rounded-3xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden border border-white/10"
              >
                <div className="flex justify-between items-center p-6 md:p-8 border-b border-surface-highlight sticky top-0 bg-surface z-10">
                  <div>
                     <h2 className="text-2xl font-display font-bold text-primary">Aesthetic Gallery</h2>
                     <p className="text-secondary text-[9px] font-bold uppercase tracking-wider mt-1 opacity-60">Verified high-quality collection</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        handleRandomCover();
                        setShowGallery(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-accent/15 text-accent border border-accent/30 rounded-xl hover:bg-accent/25 transition text-xs font-bold uppercase tracking-wider"
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
                      <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-4 pl-1 border-l-2 border-accent/20">{category}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {urls.map((url, idx) => (
                          <button 
                            key={idx}
                            onClick={() => { setImage(url); setShowGallery(false); }}
                            className={`relative aspect-video rounded-2xl overflow-hidden group border-2 transition ${image === url ? 'border-accent ring-4 ring-accent/10 scale-95' : 'border-transparent hover:border-surface-highlight hover:scale-[1.02]'}`}
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

      {/* AI Preview Inline/Floating Widget */}
      <AnimatePresence>
        {previewText && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50, transition: { duration: 0.15 } }}
            className="fixed bottom-4 left-4 right-4 md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-[150] bg-surface/95 backdrop-blur-xl border border-accent/30 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] rounded-2xl md:rounded-3xl overflow-hidden flex flex-col"
          >
            <div className="p-3 md:p-5 bg-accent/10 border-b border-surface-highlight flex justify-between items-center">
               <div className="flex items-center gap-2 md:gap-3">
                 <div className="p-1.5 md:p-2 bg-accent rounded-lg md:rounded-xl">
                   <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent-fg" />
                 </div>
                 <span className="text-xs md:text-sm font-bold text-primary uppercase tracking-wider">Review AI Suggestion</span>
               </div>
            </div>
            
            <div className="p-4 md:p-6 bg-surface/50 max-h-[40vh] overflow-y-auto">
               <div className="text-sm md:text-base text-primary leading-relaxed font-medium italic border-l-4 border-accent/50 pl-3 md:pl-4">
                  <AiGlitterTypewriter text={previewText} badgeText="Polished Result" speed={15} />
               </div>
            </div>

            <div className="p-3 md:p-5 bg-surface flex gap-2 md:gap-3 border-t border-surface-highlight">
               <button 
                  onClick={discardAiPreview}
                  className="flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl border border-surface-highlight text-secondary font-bold text-[10px] md:text-xs uppercase tracking-wider hover:bg-surface-highlight transition active:scale-[0.98] flex items-center justify-center gap-2"
               >
                  <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Reject
               </button>
               <button 
                  onClick={applyAiPreview}
                  className="flex-[2] py-3 md:py-4 rounded-xl md:rounded-2xl bg-accent text-accent-fg font-bold text-[10px] md:text-xs uppercase tracking-wider shadow-lg shadow-accent/20 hover:bg-accent/90 transition active:scale-[0.98] flex items-center justify-center gap-2"
               >
                  <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Accept
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-grow flex flex-col max-w-4xl mx-auto w-full -mt-6 md:-mt-12 z-20 px-3 md:px-6 pb-3 md:pb-6 h-full min-h-0 overflow-hidden">
        {/* Attached Media & Bidirectional Mention Micro-Chips (Non-intrusive, Mobile-First) */}
        {(scribble || song || linkedEntryIds.length > 0 || linkedTaskIds.length > 0) && (
          <div className="flex items-center gap-1.5 mb-2 px-1 overflow-x-auto no-scrollbar shrink-0">
            {scribble && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface/90 border border-surface-highlight rounded-full shadow-xs text-xs">
                <button 
                  onClick={() => setShowScribbleModal(true)} 
                  className="flex items-center gap-1.5 text-primary hover:text-accent font-medium text-[11px]"
                >
                  <Pencil className="w-3 h-3 text-accent" />
                  <span>Scribble</span>
                  <img src={scribble} alt="Scribble thumbnail" className="w-5 h-4 object-contain rounded bg-surface-highlight border border-surface-highlight" />
                </button>
                <button 
                  onClick={() => setScribble(undefined)} 
                  className="p-0.5 text-secondary hover:text-red-500 rounded-full transition"
                  title="Remove scribble"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {song && (
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface/90 border border-surface-highlight rounded-full shadow-xs text-xs">
                {song.coverArt ? (
                  <img 
                    src={song.coverArt} 
                    alt={song.title} 
                    className="w-5 h-5 rounded-full object-cover shrink-0 border border-surface-highlight" 
                  />
                ) : (
                  <Music className="w-3.5 h-3.5 text-accent shrink-0" />
                )}

                {song.previewUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAudioPreview(song.previewUrl);
                    }}
                    className={`p-1 rounded-full transition active:scale-90 ${
                      playingPreviewUrl === song.previewUrl
                        ? 'bg-accent text-accent-fg animate-pulse'
                        : 'bg-surface-highlight text-accent hover:bg-accent/20'
                    }`}
                    title={playingPreviewUrl === song.previewUrl ? "Pause preview snippet" : "Play 30s preview snippet"}
                  >
                    {playingPreviewUrl === song.previewUrl ? (
                      <Pause className="w-2.5 h-2.5 fill-current" />
                    ) : (
                      <Play className="w-2.5 h-2.5 ml-0.5 fill-current" />
                    )}
                  </button>
                )}

                <button 
                  onClick={() => setShowSongModal(true)} 
                  className="flex items-center gap-1 text-primary hover:text-accent font-medium text-[11px] max-w-[140px] truncate"
                  title="Edit soundtrack & lyrics"
                >
                  <span className="font-semibold truncate">{song.title}</span>
                  {song.artist && <span className="text-secondary text-[10px] truncate">({song.artist})</span>}
                </button>

                {(song.lyrics || lyrics) && (
                  <button
                    type="button"
                    onClick={() => setShowSongModal(true)}
                    className="px-1.5 py-0.5 rounded-full bg-accent/15 text-accent text-[9px] font-bold uppercase tracking-wider"
                    title="View / edit lyrics"
                  >
                    Lyrics
                  </button>
                )}

                <button 
                  onClick={() => {
                    stopAudioPreview();
                    setSong(undefined);
                  }} 
                  className="p-0.5 text-secondary hover:text-red-500 rounded-full transition"
                  title="Remove song"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {!song && lyrics && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface/90 border border-surface-highlight rounded-full shadow-xs text-xs">
                <button 
                  onClick={() => setShowSongModal(true)} 
                  className="flex items-center gap-1.5 text-primary hover:text-accent font-medium text-[11px]"
                >
                  <FileText className="w-3 h-3 text-accent" />
                  <span className="font-semibold">Lyrics attached</span>
                </button>
                <button 
                  onClick={() => setLyrics(undefined)} 
                  className="p-0.5 text-secondary hover:text-red-500 rounded-full transition"
                  title="Remove lyrics"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Bidirectional Mentioned Memories Chips */}
            {linkedEntryIds.map((linkedId) => {
              const targetEntry = allEntries.find((e) => e.id === linkedId);
              if (!targetEntry) return null;
              const targetTitle =
                targetEntry.title?.trim() ||
                extractAutoTitle(targetEntry.content) ||
                'Untitled Memory';
              return (
                <div
                  key={`mem-${linkedId}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface/95 border border-accent/35 rounded-full shadow-xs text-xs shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => handleNavigateToLinkedEntry(targetEntry)}
                    className="flex items-center gap-1 text-accent hover:opacity-80 font-mono font-semibold text-[11px] max-w-[150px] truncate"
                    title={`Open mentioned memory: ${targetTitle}`}
                  >
                    <BookOpen className="w-3 h-3 shrink-0" />
                    <span className="truncate">@{targetTitle}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLinkEntry(linkedId)}
                    className="p-0.5 text-secondary hover:text-red-500 rounded-full transition"
                    title="Unlink memory"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Bidirectional Linked Tasks Chips */}
            {linkedTaskIds.map((taskId) => {
              const targetTask = allTasks.find((t) => t.id === taskId);
              if (!targetTask) return null;
              return (
                <div
                  key={`task-${taskId}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface/95 border rounded-full shadow-xs text-xs shrink-0 ${
                    targetTask.completed
                      ? 'border-emerald-500/35 text-emerald-500'
                      : 'border-surface-highlight text-primary'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(8);
                      toggleTask(targetTask.id);
                    }}
                    className="flex items-center gap-1 font-mono font-semibold text-[11px] max-w-[160px] truncate hover:opacity-80"
                    title="Tap to toggle task completion"
                  >
                    <span>{targetTask.completed ? '✓' : '○'}</span>
                    <span className={`truncate ${targetTask.completed ? 'line-through opacity-80' : ''}`}>
                      {targetTask.text}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLinkTask(taskId)}
                    className="p-0.5 text-secondary hover:text-red-500 rounded-full transition"
                    title="Unlink task"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile-First Formatting & Context Toolbar */}
        <div className="editor-format-toolbar bg-surface/95 backdrop-blur-xl border border-surface-highlight shadow-md rounded-2xl p-1 flex items-center mb-2 md:mb-3 shrink-0 relative z-40">
          
          {/* Keep the two most-used marks pinned; the rest of the tools can scroll on narrow screens. */}
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <div className="editor-format-essential flex shrink-0 items-center gap-0.5 border-r border-surface-highlight/60 pr-1">
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => callCommand(toggleStrongCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Bold" aria-label="Bold"><Bold className="w-4 h-4" /></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => callCommand(toggleEmphasisCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Italic" aria-label="Italic"><Italic className="w-4 h-4" /></button>
            </div>

            <div className="min-w-0 flex-1 flex items-center gap-0.5 overflow-x-auto no-scrollbar pr-1">
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-surface-highlight/60 mr-1 shrink-0">
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => callCommand(undoCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Undo" aria-label="Undo"><Undo className="w-4 h-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => callCommand(redoCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Redo" aria-label="Redo"><Redo className="w-4 h-4" /></button>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => callCommand(wrapInHeadingCommand.key, 1)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Heading 1" aria-label="Heading 1"><Heading1 className="w-4 h-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => callCommand(wrapInHeadingCommand.key, 2)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Heading 2" aria-label="Heading 2"><Heading2 className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-surface-highlight/60 mx-0.5 shrink-0" />
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => callCommand(wrapInBulletListCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Bullet List" aria-label="Bullet list"><List className="w-4 h-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => callCommand(wrapInOrderedListCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Ordered List" aria-label="Ordered list"><ListOrdered className="w-4 h-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => callCommand(wrapInBlockquoteCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Quote" aria-label="Quote"><Quote className="w-4 h-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => callCommand(toggleStrikethroughCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Strikethrough" aria-label="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => callCommand(toggleInlineCodeCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Code" aria-label="Inline code"><Code className="w-4 h-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => callCommand(insertHrCommand.key)} className="p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-xl transition-colors" title="Divider" aria-label="Insert divider"><Minus className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* Mood Selector Button & Dropdown (outside overflow-x-auto so popover never clips) */}
          <div className="relative shrink-0 pl-1 border-l border-surface-highlight/60 ml-0.5" ref={moodMenuRef}>
            <button 
              type="button"
              onClick={() => {
                setShowMoodMenu((prev) => !prev);
                setShowAiMenu(false);
                setShowPlusDropdown(false);
                setShowKebabDropdown(false);
              }}
              className={`min-h-11 flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition border ${showMoodMenu ? 'bg-accent/10 border-accent text-accent' : 'bg-surface hover:bg-surface-highlight border-transparent text-secondary hover:text-primary'}`}
              title="Add current emotional state or mood"
            >
              {isAutoDetectingMood ? (
                <Loader2 className="w-3.5 h-3.5 md:w-4 h-4 text-accent animate-spin" />
              ) : (
                <span className="text-sm md:text-base leading-none select-none">
                  {mood && !autoMoodActive ? (mood.split(' ')[0] || '✨') : (predictedMood ? predictedMood.emoji : (autoMoodActive ? '✨' : '😊'))}
                </span>
              )}
              <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider hidden sm:inline select-none ${!mood && predictedMood ? 'opacity-60' : ''}`}>
                {isAutoDetectingMood 
                  ? 'Detecting...' 
                  : (mood && !autoMoodActive
                      ? (mood.split(' ').slice(1).join(' ') || mood) 
                      : predictedMood ? `${predictedMood.label}?` : (autoMoodActive ? 'Auto Mood' : 'Mood'))
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
                  className="absolute right-0 top-full mt-2 w-64 sm:w-72 max-w-[calc(100vw-1.5rem)] origin-top-right bg-surface rounded-2xl border border-surface-highlight shadow-2xl p-3 z-[80] flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto no-scrollbar"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-surface-highlight/50">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-secondary">Select Emotional State</span>
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

                  {predictedMood && (!mood || autoMoodActive) && (
                    <button
                      onClick={() => { setMood(predictedMood.fullMood); setAutoMoodActive(false); setShowMoodMenu(false); }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-accent/30 bg-accent/10 hover:bg-accent/15 transition text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg leading-none">{predictedMood.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-primary">Feels {predictedMood.label.toLowerCase()}</p>
                          <p className="text-[10px] text-secondary opacity-70">Predicted by your decision model as you write</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Use</span>
                    </button>
                  )}

                  {/* Auto Mood Detector AI Button */}
                  <button 
                    onClick={() => handleAutoDetectMood(true)}
                    disabled={isAutoDetectingMood}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition text-left ${
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
                        <p className="text-[10px] text-secondary opacity-70">Analyze the full entry</p>
                      </div>
                    </div>
                    {(autoMoodActive || mood === '✨ Auto') && <Check className="w-4 h-4 text-accent" />}
                  </button>

                  {/* Preset & Custom Moods Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-secondary/60">Preset & Stored Moods</span>
                      <button 
                        type="button"
                        onClick={() => setShowManageMoods(!showManageMoods)}
                        className="text-[9px] font-bold uppercase tracking-wider text-accent hover:underline flex items-center gap-1"
                      >
                        {showManageMoods ? 'Close Manager' : '+ Add Custom'}
                      </button>
                    </div>

                    {/* Manage Custom Moods Minimal Sub-Menu */}
                    {showManageMoods && (
                      <form onSubmit={handleAddCustomMoodStore} className="p-2.5 mb-2 bg-surface-highlight/30 rounded-xl border border-surface-highlight/50 space-y-2">
                        <span className="text-[9px] font-bold text-secondary uppercase tracking-wider block">Store New Mood</span>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={newMoodEmoji}
                            onChange={(e) => setNewMoodEmoji(e.target.value)}
                            placeholder="🌟"
                            className="w-12 bg-surface border border-surface-highlight/80 px-2 py-1 rounded-lg text-center text-xs text-primary"
                            maxLength={4}
                          />
                          <input
                            type="text"
                            value={newMoodLabel}
                            onChange={(e) => setNewMoodLabel(e.target.value)}
                            placeholder="Mood name..."
                            className="flex-1 bg-surface border border-surface-highlight/80 px-2.5 py-1 rounded-lg text-xs text-primary"
                          />
                          <button
                            type="submit"
                            disabled={!newMoodLabel.trim()}
                            className="px-3 py-1 bg-accent text-accent-fg font-semibold rounded-lg text-xs hover:opacity-90 disabled:opacity-40"
                          >
                            Save
                          </button>
                        </div>
                        {storedCustomMoods.length > 0 && (
                          <div className="pt-2 border-t border-surface-highlight/40 flex flex-wrap gap-1">
                            {storedCustomMoods.map(cm => (
                              <span key={cm.label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface border border-surface-highlight text-[10px] text-primary">
                                <span>{cm.emoji} {cm.label}</span>
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveCustomMoodStore(cm.label)}
                                  className="text-red-500 font-bold hover:opacity-80 ml-0.5"
                                  title="Delete custom mood"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </form>
                    )}

                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto no-scrollbar">
                      {[...PRESET_MOODS, ...storedCustomMoods].map((item) => {
                        const itemString = `${item.emoji} ${item.label}`;
                        const isSelected = mood === itemString && !autoMoodActive;
                        return (
                          <button 
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setMood(itemString);
                              setAutoMoodActive(false);
                              setShowMoodMenu(false);
                            }} 
                            className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition ${
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Assistant Button */}
          <div className="relative shrink-0 pl-1 border-l border-surface-highlight/60 ml-0.5" ref={aiMenuRef}>
            <button 
              type="button"
              onClick={() => {
                if (isProcessing) return;
                setShowAiMenu((prev) => !prev);
                setShowMoodMenu(false);
                setShowPlusDropdown(false);
                setShowKebabDropdown(false);
              }}
              disabled={isProcessing}
              className={`min-h-11 flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition border ${showAiMenu ? 'bg-accent/10 border-accent text-accent' : 'bg-surface hover:bg-surface-highlight border-transparent text-secondary hover:text-primary'}`}
              title="AI Writing Assistant"
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
                  className="absolute right-0 top-full mt-2 w-52 sm:w-56 max-w-[calc(100vw-1.5rem)] origin-top-right bg-surface rounded-2xl border border-surface-highlight shadow-2xl p-1.5 z-[80] flex flex-col gap-0.5"
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
          onClick={(e) => {
            // If clicking the empty canvas area below the prose, focus the Milkdown editor
            const target = e.target as HTMLElement;
            if (target === editorContainerRef.current || target.dataset.editorCanvas === 'true') {
              const pm = editorContainerRef.current?.querySelector('.ProseMirror') as HTMLElement | null;
              if (pm) pm.focus();
            }
          }}
          className={`editor-container flex-grow overflow-y-auto no-scrollbar bg-surface rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 border shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] relative min-h-[300px] transition-all duration-500 ${isProcessing ? 'ai-processing border-accent/50 animate-pulse' : 'border-surface-highlight/60'}`}
        >
          {/* Notion/BlockNote Style Block Handle (+ / ⋮⋮) */}
          <AnimatePresence>
            {blockHandlePos && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
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
                    const container = editorContainerRef.current;
                    const containerRect = container?.getBoundingClientRect();
                    slashTriggerRef.current = null;
                    setSlashQuery('');
                    setShowSlashMenu(true);
                    setSlashMenuPos({
                      top: containerRect ? containerRect.top + blockHandlePos.top - (container?.scrollTop || 0) + 28 : 16,
                      left: containerRect ? containerRect.left + 16 : 16,
                    });
                  }}
                  className="p-0.5 sm:p-1 hover:bg-accent/15 text-secondary hover:text-accent rounded-md sm:rounded-lg transition-colors"
                  title="Add Block (/)"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>

                <div className="relative" ref={blockMenuRef}>
                  <button
                    type="button"
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
                        <div className="px-2 py-1 text-[9px] font-bold text-secondary uppercase tracking-wider border-b border-surface-highlight/60">
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

                        <div className="px-2 py-0.5 text-[9px] font-bold text-secondary uppercase tracking-wider">
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
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
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
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-[0.97] shrink-0"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(toggleEmphasisCommand.key)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-[0.97] shrink-0"
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(toggleStrikethroughCommand.key)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-[0.97] shrink-0"
                  title="Strikethrough"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(toggleInlineCodeCommand.key)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-[0.97] shrink-0"
                  title="Inline Code"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-surface-highlight/60 mx-0.5 shrink-0"></div>

                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(wrapInHeadingCommand.key, 1)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-[0.97] shrink-0"
                  title="H1"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(wrapInHeadingCommand.key, 2)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-[0.97] shrink-0"
                  title="H2"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(wrapInBulletListCommand.key)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-[0.97] shrink-0"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => callCommand(wrapInBlockquoteCommand.key)}
                  className="p-1.5 hover:bg-surface-highlight text-secondary hover:text-primary rounded-xl transition-colors active:scale-[0.97] shrink-0"
                  title="Quote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-surface-highlight/60 mx-0.5 shrink-0"></div>

                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAiAction('IMPROVE', selectedText)}
                  className="flex items-center gap-1 px-2 py-1 bg-accent text-accent-fg hover:bg-accent/90 rounded-xl transition text-[10px] font-bold uppercase tracking-wider active:scale-[0.97] shadow-2xs shrink-0"
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
                  position: 'fixed',
                  top: slashMenuPos ? `${slashMenuPos.top}px` : '16px',
                  left: slashMenuPos ? `${slashMenuPos.left}px` : '16px',
                  zIndex: 120,
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
                      placeholder="Filter commands..."
                      className="w-full bg-surface-highlight/50 focus:bg-surface-highlight text-xs font-medium pl-8 pr-2.5 py-1 rounded-lg border border-transparent focus:border-accent/40 text-primary outline-none transition placeholder:text-secondary/50"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    {COMMAND_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-semibold whitespace-nowrap transition ${
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
                          className={`flex items-center gap-2.5 w-full p-1.5 rounded-xl text-left transition border ${
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



          <div className="relative" data-editor-canvas="true">
            {!content.trim() && (
              <div
                aria-hidden="true"
                className="pointer-events-none select-none absolute top-0.5 left-0 text-secondary/40 text-base sm:text-lg font-sans"
              >
                Start writing your thoughts, or type <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-highlight/60 text-secondary/70">/</span> for commands…
              </div>
            )}
            <MilkdownProvider>
              <EditorInstance 
                defaultValue={initialContent || ''} 
                onMarkdownUpdate={handleMarkdownUpdate} 
                onEditorReady={handleEditorReady}
                onStateChange={updateActiveStates}
              />
            </MilkdownProvider>
          </div>
        </div>
        
        <div className="mt-1.5 md:mt-2 px-2 md:px-4 flex justify-between items-center text-[10px] font-mono text-secondary/60 uppercase tracking-wider shrink-0">
           <span>
             {content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0} words &bull; {content.length} chars &bull; {Math.max(1, Math.ceil((content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0) / 180))} min read
           </span>
           <span>{selectedModel?.replace('gemini-', '') || 'AI-Ready'}</span>
        </div>
      </div>
    </motion.div>
    )}
    </AnimatePresence>

    <ScribblePadModal
      isOpen={showScribbleModal}
      onClose={() => setShowScribbleModal(false)}
      onSave={(dataUrl) => setScribble(dataUrl)}
      onRemove={() => setScribble(undefined)}
      initialScribble={scribble}
    />

    <SongAttachmentModal
      isOpen={showSongModal}
      onClose={() => setShowSongModal(false)}
      onSave={(newSong) => {
        setSong(newSong);
        if (newSong.lyrics) setLyrics(newSong.lyrics);
      }}
      onRemove={() => {
        stopAudioPreview();
        setSong(undefined);
        setLyrics(undefined);
      }}
      initialSong={useMemo(() => song || (lyrics ? { title: '', lyrics } : undefined), [
        song?.title,
        song?.artist,
        song?.album,
        song?.coverArt,
        song?.previewUrl,
        song?.url,
        song?.lyrics,
        lyrics
      ])}
    />
  </>
  );
};