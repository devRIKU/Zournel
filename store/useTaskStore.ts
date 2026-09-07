import { create } from 'zustand';
import { Task, Priority, SubTask } from '../types';

interface TaskState {
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  addTask: (text: string, priority?: Priority) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (task: Task) => void;
  addSubtask: (taskId: string, text: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  setAiAnalysis: (taskId: string, analysis: string) => void;
}

const getInitialTasks = (): Task[] => {
  try {
    const saved = localStorage.getItem('mf_tasks');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse saved tasks', e);
  }
  return [];
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: getInitialTasks(),

  setTasks: (updater) => {
    set((state) => {
      const nextTasks = typeof updater === 'function' ? updater(state.tasks) : updater;
      try {
        localStorage.setItem('mf_tasks', JSON.stringify(nextTasks));
      } catch (e) {
        console.error('Failed to save tasks to localStorage', e);
      }
      return { tasks: nextTasks };
    });
  },

  addTask: (text: string, priority: Priority = 'medium') => {
    const newTask: Task = {
      id: crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      text: text.trim(),
      completed: false,
      createdAt: Date.now(),
      priority,
      subtasks: []
    };
    get().setTasks((prev) => [newTask, ...prev]);
  },

  toggleTask: (id: string) => {
    get().setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  },

  deleteTask: (id: string) => {
    get().setTasks((prev) => prev.filter((t) => t.id !== id));
  },

  updateTask: (updatedTask: Task) => {
    get().setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
  },

  addSubtask: (taskId: string, text: string) => {
    const newSubtask: SubTask = {
      id: crypto.randomUUID ? crypto.randomUUID() : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: text.trim(),
      completed: false
    };
    get().setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return { ...t, subtasks: [...(t.subtasks || []), newSubtask] };
        }
        return t;
      })
    );
  },

  toggleSubtask: (taskId: string, subtaskId: string) => {
    get().setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId && t.subtasks) {
          return {
            ...t,
            subtasks: t.subtasks.map((s) =>
              s.id === subtaskId ? { ...s, completed: !s.completed } : s
            )
          };
        }
        return t;
      })
    );
  },

  deleteSubtask: (taskId: string, subtaskId: string) => {
    get().setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId && t.subtasks) {
          return {
            ...t,
            subtasks: t.subtasks.filter((s) => s.id !== subtaskId)
          };
        }
        return t;
      })
    );
  },

  setAiAnalysis: (taskId: string, analysis: string) => {
    get().setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, aiAnalysis: analysis } : t))
    );
  }
}));
