
import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, ChevronDown, ChevronUp, Bot, Circle } from 'lucide-react';
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
  return <button onClick={(e) => { e.stopPropagation(); onClick(); }} className={`px-2.5 py-0.5 rounded-full text-[10px] font-grotesk font-bold uppercase tracking-widest border transition-all ${getColors()}`}>{priority}</button>;
};

const TaskItem: React.FC<{ 
  task: Task; onToggle: () => void; onDelete: () => void; onUpdate: (t: Task) => void;
  completionAnim: CompletionAnimation; deleteAnim: DeleteAnimation; selectedModel?: string;
}> = ({ task, onToggle, onDelete, onUpdate, completionAnim, deleteAnim, selectedModel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = () => {
    if (!task.completed && completionAnim === 'confetti') {
        confetti({ particleCount: 50, spread: 60, colors: ['#4F46E5', '#818CF8'] });
    }
    onToggle();
  };

  const handleDelete = () => {
    if (deleteAnim === 'none') { onDelete(); return; }
    setIsDeleting(true);
    setTimeout(() => onDelete(), 450);
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
    <div className={`group bg-surface rounded-2xl p-5 mb-4 border border-surface-highlight transition-all duration-300 ${task.completed ? 'opacity-40' : 'shadow-sm hover:shadow-md'} ${isDeleting ? (deleteAnim === 'shrink' ? 'animate-shrink-out' : 'animate-slide-out-left') : ''}`}>
      <div className="flex items-start gap-4">
        <button onClick={handleToggle} className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-accent border-accent' : 'border-secondary hover:border-accent'}`}>{task.completed && <Check className="w-3.5 h-3.5 text-accent-fg" />}</button>
        <div className="flex-grow">
          <span className={`block text-lg transition-all ${task.completed ? 'line-through text-secondary' : 'text-primary'}`}>{task.text}</span>
          <div className="flex items-center gap-2 mt-1">
            <PriorityBadge priority={task.priority} onClick={() => {
                const next: Record<Priority, Priority> = { 'high': 'medium', 'medium': 'low', 'low': 'high' };
                onUpdate({ ...task, priority: next[task.priority] });
            }} />
          </div>
        </div>
        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { if (task.subtasks?.length) setIsExpanded(!isExpanded); else handleGenerateSubtasks(); }} disabled={loadingSubtasks} className="p-1.5 text-secondary hover:text-accent rounded-lg">
             {loadingSubtasks ? <Bot className="w-4 h-4 animate-pulse" /> : <Bot className="w-4 h-4"/>}
          </button>
          <button onClick={handleDelete} className="p-1.5 text-secondary hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      {(isExpanded || loadingSubtasks) && (
        <div className="mt-4 pl-8 space-y-3 animate-slide-up">
           {loadingSubtasks && <p className="text-xs font-grotesk text-accent animate-pulse">Analyzing...</p>}
           {task.subtasks?.map(st => (
             <div key={st.id} className="flex items-center gap-3">
                <button onClick={() => onUpdate({ ...task, subtasks: task.subtasks?.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s) })} className={`w-4 h-4 rounded border ${st.completed ? 'bg-secondary border-secondary' : 'border-secondary'}`}>{st.completed && <Check className="w-3 h-3 text-white" />}</button>
                <span className={`text-base ${st.completed ? 'text-secondary line-through' : 'text-primary'}`}>{st.text}</span>
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
  return (
    <div className="pb-32 px-6 max-w-3xl mx-auto w-full">
      <div className="mb-12 mt-4"><h2 className="text-5xl font-display font-bold text-primary">Tasks</h2></div>
      <div className="relative mb-12">
        <input ref={inputRef} type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown} placeholder="What is your focus?" className="w-full bg-transparent border-b-2 border-surface-highlight focus:border-accent outline-none text-2xl py-4 transition-colors"/>
      </div>
      {tasks.length === 0 ? <div className="py-20 text-center opacity-40"><p className="font-display text-2xl">No active priorities</p></div> : (
        <div className="space-y-1">
          {tasks.filter(t => !t.completed).map(task => <TaskItem key={task.id} task={task} onToggle={() => onToggleTask(task.id)} onDelete={() => onDeleteTask(task.id)} onUpdate={onUpdateTask} completionAnim={completionAnim} deleteAnim={deleteAnim} selectedModel={selectedModel} />)}
          {tasks.filter(t => t.completed).map(task => <TaskItem key={task.id} task={task} onToggle={() => onToggleTask(task.id)} onDelete={() => onDeleteTask(task.id)} onUpdate={onUpdateTask} completionAnim={completionAnim} deleteAnim={deleteAnim} selectedModel={selectedModel} />)}
        </div>
      )}
    </div>
  );
};
