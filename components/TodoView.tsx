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
}

const PriorityBadge: React.FC<{ priority: Priority; onClick: () => void }> = ({ priority, onClick }) => {
  const getColors = () => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-900/30';
      case 'medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30';
      case 'low': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30';
    }
  };

  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-grotesk font-bold uppercase tracking-widest border transition-all hover:opacity-80 ${getColors()}`}
    >
      {priority}
    </button>
  );
};

const TaskItem: React.FC<{ 
  task: Task; 
  onToggle: () => void; 
  onDelete: () => void;
  onUpdate: (t: Task) => void;
  completionAnim: CompletionAnimation;
  deleteAnim: DeleteAnimation;
}> = ({ task, onToggle, onDelete, onUpdate, completionAnim, deleteAnim }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = () => {
    if (!task.completed && completionAnim === 'confetti') {
        const defaults = { origin: { y: 0.7 } };
        confetti({
          ...defaults,
          particleCount: 50,
          spread: 60,
          colors: ['#4F46E5', '#818CF8', '#C7D2FE']
        });
    }
    onToggle();
  };

  const handleDelete = () => {
    if (deleteAnim === 'none') {
        onDelete();
        return;
    }
    
    setIsDeleting(true);
    // Wait for animation to finish before actual delete
    setTimeout(() => {
        onDelete();
    }, 450);
  };

  const handlePriorityClick = () => {
    const nextPriority: Record<Priority, Priority> = {
        'high': 'medium',
        'medium': 'low',
        'low': 'high'
    };
    onUpdate({ ...task, priority: nextPriority[task.priority] });
  };

  const handleGenerateSubtasks = async () => {
    if (task.subtasks && task.subtasks.length > 0) return;
    
    setLoadingSubtasks(true);
    const steps = await generateSubtasks(task.text);
    setLoadingSubtasks(false);
    
    if (steps.length > 0) {
      onUpdate({
        ...task,
        subtasks: steps.map(text => ({ id: Math.random().toString(36).substr(2, 9), text, completed: false }))
      });
      setIsExpanded(true);
    }
  };

  const toggleSubtask = (subId: string) => {
    if (!task.subtasks) return;
    const newSubtasks = task.subtasks.map(st => 
      st.id === subId ? { ...st, completed: !st.completed } : st
    );
    onUpdate({ ...task, subtasks: newSubtasks });
  };

  // Determine animation classes
  let animationClass = '';
  
  if (isDeleting) {
      if (deleteAnim === 'shrink') animationClass = 'animate-shrink-out';
      if (deleteAnim === 'slide-left') animationClass = 'animate-slide-out-left';
  } else if (task.completed) {
      if (completionAnim === 'slide-right') animationClass = 'animate-slide-out-right';
  }

  return (
    <div 
      className={`group bg-surface rounded-2xl p-5 mb-4 border border-surface-highlight hover:border-accent-dim transition-all duration-300
      ${task.completed ? 'opacity-40' : 'shadow-sm hover:shadow-md'}
      ${animationClass}
      `}
    >
      <div className="flex items-start gap-4">
        <button
          onClick={handleToggle}
          className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 
          ${task.completed ? 'bg-accent border-accent scale-100' : 'border-secondary hover:border-accent hover:scale-105'}
          ${!task.completed && completionAnim === 'bounce' ? 'active:scale-90' : ''}
          ${task.completed && completionAnim === 'bounce' ? 'animate-bounce-soft' : ''}
          `}
        >
          {task.completed && <Check className="w-3.5 h-3.5 text-accent-fg" />}
        </button>
        
        <div className="flex-grow">
          <div className="flex items-center gap-3 mb-1">
             <span className={`block text-lg font-sans leading-relaxed transition-all duration-300 ${task.completed ? 'line-through text-secondary' : 'text-primary'}`}>
                {task.text}
             </span>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={task.priority} onClick={handlePriorityClick} />
            {task.aiAnalysis && <span className="text-[10px] text-secondary font-grotesk opacity-60">Generated from Journal</span>}
          </div>
        </div>

        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => {
                if (task.subtasks?.length) setIsExpanded(!isExpanded);
                else handleGenerateSubtasks();
            }}
            disabled={loadingSubtasks}
            className="p-1.5 text-secondary hover:text-accent hover:bg-accent-dim rounded-lg transition-colors"
            title="AI Breakdown"
          >
             {loadingSubtasks ? <Bot className="w-4 h-4 animate-pulse" /> : 
              (task.subtasks?.length ? (isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>) : <Bot className="w-4 h-4"/>)
             }
          </button>
          <button 
            onClick={handleDelete}
            className="p-1.5 text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtasks Section */}
      {(isExpanded || loadingSubtasks) && (
        <div className="mt-4 pl-2 pr-2 space-y-3 animate-slide-up">
           {loadingSubtasks && <p className="text-sm font-grotesk text-accent animate-pulse">Thinking...</p>}
           {task.subtasks?.map(st => (
             <div key={st.id} className="flex items-center gap-3 pl-8 relative">
                <div className="absolute left-3 top-1/2 w-3 h-[1px] bg-secondary opacity-30"></div>
                <button 
                  onClick={() => toggleSubtask(st.id)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${st.completed ? 'bg-secondary border-secondary' : 'border-secondary hover:border-accent'}`}
                >
                  {st.completed && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className={`text-base font-sans ${st.completed ? 'text-secondary line-through' : 'text-primary'}`}>
                  {st.text}
                </span>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export const TodoView: React.FC<TodoViewProps> = ({ tasks, onToggleTask, onDeleteTask, onUpdateTask, onAddTask, focusInputSignal, completionAnim, deleteAnim }) => {
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusInputSignal > 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focusInputSignal]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputText.trim()) {
      onAddTask(inputText);
      setInputText('');
    }
  };

  return (
    <div className="pb-32 px-6 max-w-3xl mx-auto w-full">
      <div className="mb-12 mt-4">
        <h2 className="text-5xl font-display font-bold text-primary tracking-tight">Tasks</h2>
        <p className="font-grotesk text-secondary mt-2 text-sm uppercase tracking-widest">Execute your vision</p>
      </div>

      {/* Input Field - Styled Minimalist */}
      <div className="relative mb-12">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What is your focus?"
          className="w-full bg-transparent border-b-2 border-surface-highlight focus:border-accent outline-none text-2xl font-sans text-primary placeholder:text-secondary/30 py-4 transition-colors"
        />
        <div className="absolute right-0 top-4 opacity-30 text-xs font-grotesk text-secondary">
          PRESS ENTER
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
           <Circle className="w-16 h-16 text-secondary mb-4 stroke-[1]" />
           <p className="font-display text-2xl text-secondary">No active priorities</p>
           <p className="font-grotesk text-sm text-secondary mt-2">Enjoy your free time</p>
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="space-y-1">
            {pendingTasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onToggle={() => onToggleTask(task.id)} 
                onDelete={() => onDeleteTask(task.id)}
                onUpdate={onUpdateTask}
                completionAnim={completionAnim}
                deleteAnim={deleteAnim}
              />
            ))}
          </div>
          
          {completedTasks.length > 0 && (
            <div className="mt-16">
               <div className="flex items-center gap-4 mb-6 opacity-50">
                 <div className="h-[1px] flex-1 bg-secondary"></div>
                 <span className="font-grotesk text-xs font-bold text-secondary uppercase tracking-widest">Done</span>
                 <div className="h-[1px] flex-1 bg-secondary"></div>
               </div>
               <div className="space-y-1">
                {completedTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={() => onToggleTask(task.id)} 
                    onDelete={() => onDeleteTask(task.id)}
                    onUpdate={onUpdateTask}
                    completionAnim={completionAnim}
                    deleteAnim={deleteAnim}
                  />
                ))}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};