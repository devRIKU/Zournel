import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Plus, Check, Trash2, Bot, CheckCircle2, Sparkles } from 'lucide-react';
import { Task, Priority, ModelType } from '../types';
import { generateSubtasks } from '../services/geminiService';
import { AiGlitterPill } from './AiGlitterTypewriter';
import { iosSpring, triggerHaptic } from '../utils/uiSprings';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { CardSpotlight } from './ui/card-spotlight';
import { SparklesText } from './ui/sparkles';

interface TodoViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  onAddTask: (text: string) => void;
  focusInputSignal?: number;
  completionAnim?: string;
  deleteAnim?: string;
  selectedModel?: ModelType;
}

const PriorityBadge: React.FC<{ priority: Priority; onClick: () => void }> = ({ priority, onClick }) => {
  const variantMap: Record<Priority, 'destructive' | 'default' | 'secondary'> = {
    high: 'destructive',
    medium: 'default',
    low: 'secondary',
  };
  return (
    <Badge 
      variant={variantMap[priority]}
      onClick={(e) => { e.stopPropagation(); triggerHaptic(6); onClick(); }} 
      title="Change Priority"
      className="cursor-pointer uppercase tracking-widest text-[10px] font-mono hover:opacity-80 active:scale-95 transition select-none"
    >
      {priority}
    </Badge>
  );
};

const TaskItem: React.FC<{
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (task: Task) => void;
  completionAnim?: string;
  deleteAnim?: string;
  selectedModel?: ModelType;
}> = ({ task, onToggle, onDelete, onUpdate, completionAnim, selectedModel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<{ id: string; text: string }[]>([]);

  const handleToggle = () => {
    triggerHaptic(task.completed ? 10 : 20);
    if (!task.completed && completionAnim === 'confetti') {
      confetti({ particleCount: 30, spread: 40, colors: ['#C69C6D', '#F59E0B'], origin: { y: 0.7 } });
    }
    onToggle();
  };

  const handleDelete = () => {
    triggerHaptic(12);
    onDelete();
  };

  const handleGenerateSubtasks = async () => {
    if (task.subtasks?.length && suggestedSubtasks.length === 0) return;
    triggerHaptic(8);
    setLoadingSubtasks(true);
    setIsExpanded(true);
    const steps = await generateSubtasks(task.text, selectedModel);
    setLoadingSubtasks(false);
    if (steps.length > 0) {
      setSuggestedSubtasks(steps.map(text => ({ id: Math.random().toString(36).substr(2, 9), text })));
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
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.16 } }}
      transition={iosSpring}
      className={`group relative mb-3 transition-opacity ${task.completed ? 'opacity-65' : 'opacity-100'}`}
    >
      <CardSpotlight
        radius={220}
        color="rgba(198, 156, 109, 0.12)"
        className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-surface-highlight/80 bg-surface/90 backdrop-blur-md transition-all ${
          task.completed ? 'border-surface-highlight/40' : 'hover:border-accent/40 shadow-xs hover:shadow-md'
        }`}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Minimum 44px touch target on mobile */}
          <button 
            type="button"
            onClick={handleToggle} 
            title={task.completed ? "Mark as incomplete" : "Mark as complete"}
            className="flex-shrink-0 w-11 h-11 -ml-1.5 -mt-1 flex items-center justify-center transition active:scale-90 focus:outline-none cursor-pointer"
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              task.completed ? 'bg-accent border-accent scale-105 shadow-xs' : 'border-secondary/60 hover:border-accent'
            }`}>
              {task.completed && <Check className="w-3.5 h-3.5 stroke-[3] text-accent-fg" />}
            </div>
          </button>

          <div className="flex-grow pt-1 min-w-0">
            <span className={`block text-base sm:text-lg transition-colors duration-200 leading-snug break-words ${
              task.completed ? 'line-through text-secondary' : 'text-primary font-medium'
            }`}>
              {task.text}
            </span>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <PriorityBadge 
                priority={task.priority} 
                onClick={() => {
                  const next: Record<Priority, Priority> = { 'high': 'medium', 'medium': 'low', 'low': 'high' };
                  onUpdate({ ...task, priority: next[task.priority] });
                }} 
              />
              {task.aiAnalysis && (
                <AiGlitterPill label={task.aiAnalysis} />
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => { 
                if (task.subtasks?.length || suggestedSubtasks.length) setIsExpanded(!isExpanded); 
                else handleGenerateSubtasks(); 
              }} 
              disabled={loadingSubtasks} 
              title="AI Breakdown (Subtasks)"
              className="w-10 h-10 flex items-center justify-center text-secondary hover:text-accent rounded-xl hover:bg-surface-highlight/60 transition active:scale-90"
            >
              {loadingSubtasks ? <Bot className="w-4 h-4 animate-pulse text-accent" /> : <Bot className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleDelete} 
              title="Delete Task" 
              className="w-10 h-10 flex items-center justify-center text-secondary hover:text-red-500 rounded-xl hover:bg-surface-highlight/60 transition active:scale-90"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Subtasks Section */}
        {(isExpanded || loadingSubtasks) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={iosSpring}
            className="mt-4 pt-3 border-t border-surface-highlight/50 pl-2 sm:pl-9 space-y-3"
          >
            {loadingSubtasks && (
              <div className="py-2 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border border-surface-highlight bg-surface-highlight/50 animate-pulse" />
                  <div className="h-4 bg-surface-highlight/50 rounded w-2/3 animate-pulse" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border border-surface-highlight bg-surface-highlight/50 animate-pulse" />
                  <div className="h-4 bg-surface-highlight/50 rounded w-1/2 animate-pulse" />
                </div>
                <AiGlitterPill label="Decomposing into actionable steps..." />
              </div>
            )}
            
            {!loadingSubtasks && suggestedSubtasks.length > 0 && (
              <div className="bg-accent/10 border border-accent/25 rounded-2xl p-3.5 space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Suggested Steps</span>
                </div>
                {suggestedSubtasks.map(st => (
                  <div key={st.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-sm text-primary">{st.text}</span>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <Button size="sm" onClick={() => handleAcceptSubtask(st)} className="h-7 px-2.5 text-xs rounded-lg">
                        + Add
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleDismissSubtask(st.id)} className="h-7 px-2.5 text-xs rounded-lg">
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {task.subtasks?.map(st => (
              <div key={st.id} className="flex items-center gap-3 py-1 group/sub">
                <button 
                  onClick={() => {
                    triggerHaptic(10);
                    onUpdate({ 
                      ...task, 
                      subtasks: task.subtasks?.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s) 
                    });
                  }} 
                  className="w-8 h-8 flex items-center justify-center transition active:scale-90"
                >
                  <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                    st.completed ? 'bg-accent border-accent text-accent-fg' : 'border-secondary/60 hover:border-accent'
                  }`}>
                    {st.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
                <span className={`text-sm transition-colors ${st.completed ? 'text-secondary line-through' : 'text-primary'}`}>
                  {st.text}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </CardSpotlight>
    </motion.div>
  );
};

export const TodoView: React.FC<TodoViewProps> = ({ 
  tasks, 
  onToggleTask, 
  onDeleteTask, 
  onUpdateTask, 
  onAddTask, 
  focusInputSignal, 
  completionAnim, 
  deleteAnim, 
  selectedModel 
}) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
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
  
  const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);
  const activeTasks = sortedTasks.filter(t => !t.completed);
  const completedTasks = sortedTasks.filter(t => t.completed);
  const displayedTasks = sortedTasks;

  return (
    <div className="pb-32 px-4 sm:px-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6 mt-3 sm:mt-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-primary tracking-tight">
            <SparklesText text="Focus Tasks" sparklesCount={4} />
          </h2>
          <p className="text-xs sm:text-sm text-secondary font-medium">
            {activeTasks.length} active &bull; {completedTasks.length} completed
          </p>
        </div>
      </div>

      {/* Task Input (Original Design) */}
      <div className="relative mb-10 flex items-center">
        <input 
          ref={inputRef} 
          type="text" 
          value={inputText} 
          onChange={(e) => setInputText(e.target.value)} 
          onKeyDown={handleKeyDown} 
          placeholder="What's on your list?" 
          title="Type a task and press Enter"
          className="w-full bg-transparent border-b-2 border-surface-highlight focus:border-accent outline-none text-xl sm:text-2xl py-4 transition duration-200 placeholder:opacity-30 pr-14"
        />
        {inputText.trim().length > 0 && (
          <button
            onClick={() => { 
              triggerHaptic(10); 
              onAddTask(inputText.trim()); 
              setInputText(''); 
            }}
            title="Add task"
            className="absolute right-2 p-2.5 bg-accent text-accent-fg rounded-full shadow-md active:scale-95 transition"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Task List */}
      {displayedTasks.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 border border-dashed border-surface-highlight/70 rounded-3xl p-6 bg-surface/30">
          <div className="p-4 rounded-full bg-surface-highlight/50 text-secondary">
            <CheckCircle2 className="w-8 h-8 opacity-60" />
          </div>
          <p className="font-display text-xl font-bold text-primary">
            No tasks in this list
          </p>
          <p className="text-xs text-secondary max-w-xs">
            Add your first task above to get started with calm momentum.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {activeTasks.length === 0 && completedTasks.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={iosSpring}
              className="mb-6 p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-200 flex items-center gap-3.5"
            >
              <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-500" />
              <div>
                <h4 className="font-bold text-sm">All caught up!</h4>
                <p className="text-xs opacity-80">You cleared all active tasks. Take a breath and reflect in your journal.</p>
              </div>
            </motion.div>
          )}
          
          <AnimatePresence mode="popLayout">
            {displayedTasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onToggle={() => onToggleTask(task.id)} 
                onDelete={() => onDeleteTask(task.id)} 
                onUpdate={onUpdateTask} 
                completionAnim={completionAnim} 
                deleteAnim={deleteAnim} 
                selectedModel={selectedModel} 
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default TodoView;
