import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, Bot, ClipboardList } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Task, CompletionAnimation, DeleteAnimation, Priority } from '../types';
import { generateSubtasks } from '../services/geminiService';

interface TodoViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (updatedTask: Task) => void;
  onAddTask: (text: string) => void;
  focusInputSignal: number;
  completionAnim: CompletionAnimation;
  deleteAnim: DeleteAnimation;
  selectedModel?: string;
}

const PriorityBadge: React.FC<{ priority: Priority; onClick: () => void }> = ({ priority, onClick }) => {
  const getColors = () => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 border-red-200/50';
      case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-200/50';
      case 'low': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50';
    }
  };
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      title="Change Priority"
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-grotesk font-bold uppercase tracking-widest border transition-all active:scale-90 ${getColors()}`}
    >
      {priority}
    </button>
  );
};

// Fixed destructuring syntax: changed semicolons to commas in the argument list to resolve scope errors.
const TaskItem: React.FC<{ 
  task: Task; onToggle: () => void; onDelete: () => void; onUpdate: (t: Task) => void;
  completionAnim: CompletionAnimation; deleteAnim: DeleteAnimation; selectedModel?: string;
}> = ({ task, onToggle, onDelete, onUpdate, completionAnim, deleteAnim, selectedModel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = () => {
    if (!task.completed && completionAnim === 'confetti') {
        confetti({ particleCount: 30, spread: 40, colors: ['#4F46E5', '#818CF8'], origin: { y: 0.7 } });
    }
    onToggle();
  };

  const handleDelete = () => {
    if (deleteAnim === 'none') { onDelete(); return; }
    setIsDeleting(true);
    setTimeout(() => onDelete(), 300);
  };

  const handleGenerateSubtasks = async () => {
    if (task.subtasks?.length) return;
    setLoadingSubtasks(true);
    const steps = await generateSubtasks(task.text, selectedModel);
    setLoadingSubtasks(false);
    if (steps.length > 0) {
      onUpdate({ ...task, subtasks: steps.map(text => ({ id: Math.random().toString(36).substr(2, 9), text, completed: false })) });
      setIsExpanded(true);
    }
  };

  return (
    <div className={`group bg-surface rounded-2xl p-5 mb-3 border border-surface-highlight transition-all duration-300 hover-lift ${task.completed ? 'opacity-50 scale-[0.98]' : 'shadow-sm hover:shadow-md'} ${isDeleting ? 'animate-fade-out scale-90 translate-x-10' : ''}`}>
      <div className="flex items-start gap-4">
        <button 
          onClick={handleToggle} 
          title={task.completed ? "Mark as incomplete" : "Mark as complete"}
          className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all active:scale-75 ${task.completed ? 'bg-accent border-accent' : 'border-secondary hover:border-accent'}`}
        >
          {task.completed && <Check className="w-3.5 h-3.5 text-accent-fg" />}
        </button>
        <div className="flex-grow">
          <span className={`block text-lg transition-all duration-300 ${task.completed ? 'line-through text-secondary' : 'text-primary'}`}>{task.text}</span>
          <div className="flex items-center gap-2 mt-1">
            <PriorityBadge priority={task.priority} onClick={() => {
                const next: Record<Priority, Priority> = { 'high': 'medium', 'medium': 'low', 'low': 'high' };
                onUpdate({ ...task, priority: next[task.priority] });
            }} />
            {task.aiAnalysis && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full italic animate-fade-in select-none">
                ✨ {task.aiAnalysis}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => { if (task.subtasks?.length) setIsExpanded(!isExpanded); else handleGenerateSubtasks(); }} 
            disabled={loadingSubtasks} 
            title="AI Breakdown (Subtasks)"
            className="p-1.5 text-secondary hover:text-accent rounded-lg transition-colors active:scale-90"
          >
             {loadingSubtasks ? <Bot className="w-4 h-4 animate-pulse" /> : <Bot className="w-4 h-4"/>}
          </button>
          <button onClick={handleDelete} title="Delete Task" className="p-1.5 text-secondary hover:text-red-600 rounded-lg transition-colors active:scale-90"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      {(isExpanded || loadingSubtasks) && (
        <div className="mt-4 pl-8 space-y-3 animate-slide-up">
           {loadingSubtasks && <p className="text-[10px] font-grotesk font-bold uppercase tracking-widest text-accent animate-pulse">Deep Analysis...</p>}
           {task.subtasks?.map(st => (
             <div key={st.id} className="flex items-center gap-3 group/sub">
                <button 
                  onClick={() => onUpdate({ ...task, subtasks: task.subtasks?.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s) })} 
                  className={`w-4 h-4 rounded border transition-all active:scale-75 ${st.completed ? 'bg-secondary border-secondary' : 'border-secondary hover:border-accent'}`}
                >
                  {st.completed && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className={`text-base transition-colors ${st.completed ? 'text-secondary line-through' : 'text-primary'}`}>{st.text}</span>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export const TodoView: React.FC<TodoViewProps> = ({ tasks, onToggleTask, onDeleteTask, onUpdateTask, onAddTask, focusInputSignal, completionAnim, deleteAnim, selectedModel }) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => { if (focusInputSignal > 0 && inputRef.current) inputRef.current.focus(); }, [focusInputSignal]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && inputText.trim()) { onAddTask(inputText); setInputText(''); } };
  
  // Sort tasks by time (newest first)
  const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);
  const activeTasks = sortedTasks.filter(t => !t.completed);
  const completedTasks = sortedTasks.filter(t => t.completed);

  return (
    <div className="pb-32 px-4 sm:px-6 max-w-3xl mx-auto w-full animate-fade-in">
      <div className="mb-12 mt-4 flex items-center gap-4">
        <div className="p-3 bg-accent/10 rounded-2xl">
          <ClipboardList className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-4xl sm:text-5xl font-display font-bold text-primary tracking-tight">Tasks</h2>
      </div>
      <div className="relative mb-12">
        <input 
          ref={inputRef} 
          type="text" 
          value={inputText} 
          onChange={(e) => setInputText(e.target.value)} 
          onKeyDown={handleKeyDown} 
          placeholder="What's on your list?" 
          title="Type a task and press Enter"
          className="w-full bg-transparent border-b-2 border-surface-highlight focus:border-accent outline-none text-xl sm:text-2xl py-4 transition-all duration-300 placeholder:opacity-30"
        />
      </div>
      {tasks.length === 0 ? (
        <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
          <Check className="w-12 h-12 text-accent/50" />
          <p className="font-display text-2xl">Nothing to do</p>
        </div>
      ) : (
        <div className="space-y-1">
          {activeTasks.map(task => <TaskItem key={task.id} task={task} onToggle={() => onToggleTask(task.id)} onDelete={() => onDeleteTask(task.id)} onUpdate={onUpdateTask} completionAnim={completionAnim} deleteAnim={deleteAnim} selectedModel={selectedModel} />)}
          {completedTasks.length > 0 && (
            <>
              <div className="pt-8 pb-4 flex items-center gap-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary opacity-50">Completed</span>
                <div className="h-px flex-grow bg-surface-highlight opacity-30"></div>
              </div>
              {completedTasks.map(task => <TaskItem key={task.id} task={task} onToggle={() => onToggleTask(task.id)} onDelete={() => onDeleteTask(task.id)} onUpdate={onUpdateTask} completionAnim={completionAnim} deleteAnim={deleteAnim} selectedModel={selectedModel} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
};