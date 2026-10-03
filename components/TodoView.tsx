import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Plus, Check, Trash2, Bot, CheckCircle2, Sparkles, Feather, BookOpen } from './Icons';
import { isJevAvailable, classifyQuickEntry } from '../services/jevService';
import { Task, Priority, JournalEntry } from '../types';
import { generateSubtasks, extractAutoTitle } from '../services/geminiService';
import { AiGlitterPill } from './AiGlitterTypewriter';
import { iosSpringSnappy, mechanicalSpring, triggerHaptic } from '../utils/uiSprings';
import { DraggableSegmentedToggle } from './ui/DraggableToggle';
import { PageHeader } from './ui/PageHeader';

interface TodoViewProps {
  tasks: Task[];
  journalEntries?: JournalEntry[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  onAddTask: (text: string) => void;
  onReflectOnTask?: (task: Task) => void;
  onSaveAsMemory?: (text: string) => void;
  focusInputSignal?: number;
  completionAnim?: string;
  deleteAnim?: string;
  selectedModel?: string;
}

const PriorityBadge: React.FC<{ priority: Priority; predicted?: boolean; onClick: () => void }> = ({ priority, predicted, onClick }) => {
  const colorStyles: Record<Priority, string> = {
    high: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    medium: 'text-secondary bg-surface-highlight/50 border-surface-highlight',
    low: 'text-secondary/60 bg-transparent border-transparent hover:bg-surface-highlight/40',
  };

  return (
    <button
      type="button"
      onClick={(e) => { 
        e.stopPropagation(); 
        triggerHaptic(6); 
        onClick(); 
      }} 
      title={predicted ? 'Priority predicted by Jev — tap to change' : 'Toggle priority (Low / Med / High)'}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold border transition-transform active:scale-95 select-none ${colorStyles[priority]}`}
    >
      {predicted && <span className="w-1 h-1 rounded-full bg-accent" aria-hidden />}
      {priority}
    </button>
  );
};

const TaskItem: React.FC<{
  task: Task;
  linkedEntry?: JournalEntry;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (task: Task) => void;
  onReflect?: () => void;
  completionAnim?: string;
  selectedModel?: string;
}> = ({ task, linkedEntry, onToggle, onDelete, onUpdate, onReflect, completionAnim, selectedModel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<{ id: string; text: string }[]>([]);
  const isCompound = (task.predicted?.isCompound ?? 0) >= 0.7;

  const handleToggle = () => {
    triggerHaptic(task.completed ? 10 : 22);
    if (!task.completed && completionAnim === 'confetti') {
      confetti({ 
        particleCount: 24, 
        spread: 35, 
        colors: ['#B86B1E', '#F59E0B', '#10B981'], 
        origin: { y: 0.7 } 
      });
    }
    onToggle();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(14);
    onDelete();
  };

  const handleGenerateSubtasks = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.subtasks?.length && suggestedSubtasks.length === 0) {
      setIsExpanded(!isExpanded);
      return;
    }
    triggerHaptic(8);
    setLoadingSubtasks(true);
    setIsExpanded(true);
    try {
      const steps = await generateSubtasks(task.text, selectedModel);
      if (steps.length > 0) {
        setSuggestedSubtasks(steps.map(text => ({ id: Math.random().toString(36).slice(2, 11), text })));
      }
    } finally {
      setLoadingSubtasks(false);
    }
  };

  const handleAcceptSubtask = (st: { id: string; text: string }) => {
    triggerHaptic(8);
    onUpdate({ ...task, subtasks: [...(task.subtasks || []), { ...st, completed: false }] });
    setSuggestedSubtasks(prev => prev.filter(s => s.id !== st.id));
  };

  const handleDismissSubtask = (id: string) => {
    triggerHaptic(5);
    setSuggestedSubtasks(prev => prev.filter(s => s.id !== id));
  };

  return (
    <motion.div 
      layout="position"
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.14 } }}
      transition={mechanicalSpring}
      style={{ contain: 'content' }}
      className={`group relative rounded-2xl bg-surface border border-surface-highlight p-4 transition-colors ${
        task.completed ? 'opacity-60 bg-surface/50' : 'hover:border-accent/30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Mechanical Checkbox (Things 3 snap) */}
        <button 
          type="button"
          onClick={handleToggle} 
          title={task.completed ? "Mark incomplete" : "Mark complete"}
         
          className="shrink-0 w-8 h-8 -ml-1 -mt-1 flex items-center justify-center rounded-lg active:scale-85 transition-transform select-none cursor-pointer"
        >
          <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${
            task.completed 
              ? 'bg-accent border-accent scale-100 shadow-xs' 
              : 'border-secondary/50 hover:border-accent/80'
          }`}>
            {task.completed && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={mechanicalSpring}
              >
                <Check className="w-3 h-3 text-accent-fg" />
              </motion.div>
            )}
          </div>
        </button>

        {/* Task Text & Metadata */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className={`text-sm sm:text-base leading-snug break-words transition-colors ${
            task.completed ? 'line-through text-secondary/70' : 'text-primary font-medium'
          }`}>
            {task.text}
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <PriorityBadge 
              priority={task.priority} 
              predicted={Boolean(task.predicted)}
              onClick={() => {
                const next: Record<Priority, Priority> = { 'high': 'medium', 'medium': 'low', 'low': 'high' };
                onUpdate({ ...task, priority: next[task.priority], predicted: undefined });
              }} 
            />
            {linkedEntry && onReflect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(8);
                  onReflect();
                }}
                title="Open linked journal memory"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-accent/10 hover:bg-accent/20 text-accent border border-accent/25 transition active:scale-95 max-w-[190px] truncate"
              >
                <BookOpen className="w-3 h-3 shrink-0" />
                <span className="truncate">{linkedEntry.title || extractAutoTitle(linkedEntry.content)}</span>
              </button>
            )}
            {task.aiAnalysis && (
              <AiGlitterPill label={task.aiAnalysis} />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {onReflect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(8);
                onReflect();
              }}
              title={linkedEntry ? 'Open linked memory' : 'Reflect on this task in Journal'}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-transform active:scale-90 ${
                linkedEntry
                  ? 'text-accent bg-accent/10 !opacity-100'
                  : 'text-secondary hover:text-accent hover:bg-surface-highlight/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}
          <button 
            type="button"
            onClick={handleGenerateSubtasks}
            disabled={loadingSubtasks} 
            title={isCompound ? 'Looks like several steps — break it down' : 'Subtask Assistant'}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-transform active:scale-90 ${
              isCompound && !task.completed && !(task.subtasks?.length)
                ? 'text-accent bg-accent/10 !opacity-100'
                : 'text-secondary hover:text-accent hover:bg-surface-highlight/50'
            }`}
          >
            {loadingSubtasks ? <Bot className="w-4 h-4 animate-pulse text-accent" /> : <Bot className="w-4 h-4" />}
          </button>
          <button 
            type="button"
            onClick={handleDelete} 
            title="Delete Task" 
           
            className="w-8 h-8 flex items-center justify-center text-secondary hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-transform active:scale-90"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtasks Section - GPU-only fade & translate (Zero height-animation reflows) */}
      {(isExpanded || loadingSubtasks) && (
        <motion.div 
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={iosSpringSnappy}
          style={{ willChange: 'transform, opacity' }}
          className="mt-3 pt-3 border-t border-surface-highlight/60 pl-2 sm:pl-7 space-y-2.5"
        >
          {loadingSubtasks && (
            <div className="py-2 space-y-2 animate-pulse">
              <div className="h-3.5 bg-surface-highlight/50 rounded w-2/3" />
              <div className="h-3.5 bg-surface-highlight/50 rounded w-1/2" />
            </div>
          )}

          {!loadingSubtasks && suggestedSubtasks.length > 0 && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Suggested Steps</span>
              </div>
              {suggestedSubtasks.map(st => (
                <div key={st.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm text-primary">{st.text}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => handleAcceptSubtask(st)}
                     
                      className="px-2 py-1 text-xs font-medium rounded-md bg-accent text-accent-fg hover:opacity-90 active:scale-95 transition-transform"
                    >
                      + Add
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDismissSubtask(st.id)}
                     
                      className="px-2 py-1 text-xs font-medium rounded-md text-secondary hover:text-primary active:scale-95 transition-transform"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {task.subtasks?.map(st => (
            <div key={st.id} className="flex items-center gap-2.5 py-1">
              <button 
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  onUpdate({ 
                    ...task, 
                    subtasks: task.subtasks?.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s) 
                  });
                }} 
               
                className="w-5 h-5 rounded border border-secondary/50 flex items-center justify-center transition active:scale-90"
              >
                {st.completed && <Check className="w-3 h-3 text-accent" />}
              </button>
              <span className={`text-xs sm:text-sm transition-colors ${st.completed ? 'text-secondary line-through' : 'text-primary'}`}>
                {st.text}
              </span>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export const TodoView: React.FC<TodoViewProps> = ({ 
  tasks, 
  journalEntries = [],
  onToggleTask, 
  onDeleteTask, 
  onUpdateTask, 
  onAddTask, 
  onReflectOnTask,
  onSaveAsMemory,
  focusInputSignal, 
  completionAnim, 
  selectedModel 
}) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [looksLikeReflection, setLooksLikeReflection] = useState(false);

  // Predictive intent: if a long line reads like a diary thought, offer the journal instead.
  useEffect(() => {
    setLooksLikeReflection(false);
    if (!isJevAvailable() || inputText.trim().split(/\s+/).length < 6) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      classifyQuickEntry(inputText, ctrl.signal).then(kind => {
        if (!ctrl.signal.aborted) setLooksLikeReflection(kind === 'reflection');
      });
    }, 900);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [inputText]);
  
  useEffect(() => { 
    if (focusInputSignal && focusInputSignal > 0 && inputRef.current) {
      inputRef.current.focus(); 
    }
  }, [focusInputSignal]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => { 
    if (e.key === 'Enter' && inputText.trim()) { 
      triggerHaptic(10);
      onAddTask(inputText.trim()); 
      setInputText(''); 
    } 
  };
  
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  
  const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);
  const activeTasks = sortedTasks.filter(t => !t.completed);
  const completedTasks = sortedTasks.filter(t => t.completed);
  const displayedTasks = sortedTasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto w-full">
      <PageHeader
        title="Today"
        subtitle={<>{activeTasks.length} pending &bull; {completedTasks.length} completed</>}
        actions={
          <DraggableSegmentedToggle
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: `Active (${activeTasks.length})` },
              { value: 'completed', label: `Done (${completedTasks.length})` }
            ]}
            value={filter}
            onChange={(val) => setFilter(val as 'all' | 'active' | 'completed')}
          />
        }
      />

      {/* Mechanical Quick-Entry Input (Things 3 style) */}
      <div className="relative mb-6">
        <div className="flex items-center gap-2 h-12 rounded-2xl bg-surface border border-surface-highlight focus-within:border-accent/60 transition-colors px-4">
          <input 
            ref={inputRef} 
            type="text" 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            onKeyDown={handleKeyDown} 
            placeholder="Add a new action..." 
            title="Type task and press Enter"
            className="w-full bg-transparent outline-none text-sm sm:text-base text-primary placeholder:text-secondary/50"
          />
          {looksLikeReflection && onSaveAsMemory && (
            <button
              type="button"
              onClick={() => { triggerHaptic(10); onSaveAsMemory(inputText.trim()); setInputText(''); }}
              title="This reads like a reflection — save it as a memory instead"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[11px] font-medium text-accent bg-accent/10 hover:bg-accent/15 transition shrink-0 animate-fade-in"
            >
              <Feather className="w-3.5 h-3.5" /> Memory?
            </button>
          )}
          {inputText.trim().length > 0 && (
            <button
              type="button"
              onClick={() => { 
                triggerHaptic(10); 
                onAddTask(inputText.trim()); 
                setInputText(''); 
              }}
              title="Add task"
             
              className="w-8 h-8 bg-accent text-accent-fg rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0"
            >
              <Plus className="w-4 h-4" weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      {displayedTasks.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-highlight p-6">
          <CheckCircle2 className="w-6 h-6 text-secondary/40" />
          <p className="text-sm font-medium text-primary">
            {filter === 'all' ? 'No tasks in your queue' : filter === 'active' ? 'No pending tasks' : 'No completed tasks yet'}
          </p>
          <p className="text-xs text-secondary/60">
            {filter === 'completed' ? 'Mark a task as complete to see it here.' : 'Press Enter above to log an action.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeTasks.length === 0 && completedTasks.length > 0 && filter !== 'completed' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={mechanicalSpring}
              className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Queue cleared. Everything completed.</span>
            </motion.div>
          )}
          
          <AnimatePresence mode="popLayout">
            {displayedTasks.map(task => {
              const linkedEntry = journalEntries.find(
                (e) => e.id === task.linkedEntryId || e.linkedTaskIds?.includes(task.id)
              );
              return (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  linkedEntry={linkedEntry}
                  onToggle={() => onToggleTask(task.id)} 
                  onDelete={() => onDeleteTask(task.id)} 
                  onUpdate={onUpdateTask} 
                  onReflect={onReflectOnTask ? () => onReflectOnTask(task) : undefined}
                  completionAnim={completionAnim} 
                  selectedModel={selectedModel} 
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default TodoView;
