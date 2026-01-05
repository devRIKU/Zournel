import React from 'react';
import { Tab } from '../types';
import { ListTodo, Library } from 'lucide-react';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full z-40 pointer-events-none pb-8 animate-slide-up">
      <div className="w-full flex justify-center items-end px-4">
        <div className="pointer-events-auto flex items-center bg-surface/90 backdrop-blur-2xl shadow-2xl rounded-full p-1.5 border border-surface-highlight">
          
          <button 
            onClick={() => onTabChange(Tab.TODO)}
            title="Switch to Tasks View"
            className={`px-6 sm:px-8 py-3 rounded-full font-grotesk text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 active:scale-90 flex items-center gap-2 ${
                activeTab === Tab.TODO 
                ? 'bg-primary text-bg shadow-lg scale-105' 
                : 'text-secondary hover:text-primary hover:bg-surface-highlight/50'
            }`}
          >
            <ListTodo className={`w-4 h-4 ${activeTab === Tab.TODO ? 'opacity-100' : 'opacity-40'}`} />
            <span>Tasks</span>
          </button>

          <button 
            onClick={() => onTabChange(Tab.JOURNAL)}
            title="Switch to Memories View"
            className={`px-6 sm:px-8 py-3 rounded-full font-grotesk text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 active:scale-90 flex items-center gap-2 ${
                activeTab === Tab.JOURNAL 
                ? 'bg-primary text-bg shadow-lg scale-105' 
                : 'text-secondary hover:text-primary hover:bg-surface-highlight/50'
            }`}
          >
             <Library className={`w-4 h-4 ${activeTab === Tab.JOURNAL ? 'opacity-100' : 'opacity-40'}`} />
             <span>Memories</span>
          </button>

        </div>
      </div>
    </div>
  );
};