import React from 'react';
import { motion } from 'motion/react';
import { Tab } from '../types';
import { ListTodo, Library, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full z-40 pointer-events-none pb-8">
      <div className="w-full flex justify-center items-end px-4">
        <div className="pointer-events-auto flex items-center bg-surface/90 backdrop-blur-2xl shadow-2xl rounded-full p-1.5 border border-surface-highlight relative overflow-hidden">
          
          <button 
            onClick={() => onTabChange(Tab.TODO)}
            title="Switch to Tasks View"
            className={`relative px-4 sm:px-6 py-3.5 rounded-full font-grotesk text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase transition duration-300 active:scale-[0.97] flex items-center gap-2 outline-none ${
                activeTab === Tab.TODO 
                ? 'text-bg font-extrabold' 
                : 'text-secondary hover:text-primary'
            }`}
          >
            {activeTab === Tab.TODO && (
              <motion.div 
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-primary rounded-full z-0"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <ListTodo className="w-4 h-4 hidden sm:block" />
              <span>Tasks</span>
            </span>
          </button>

          <button 
            onClick={() => onTabChange(Tab.JOURNAL)}
            title="Switch to Memories View"
            className={`relative px-4 sm:px-6 py-3.5 rounded-full font-grotesk text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase transition duration-300 active:scale-[0.97] flex items-center gap-2 outline-none ${
                activeTab === Tab.JOURNAL 
                ? 'text-bg font-extrabold' 
                : 'text-secondary hover:text-primary'
            }`}
          >
             {activeTab === Tab.JOURNAL && (
              <motion.div 
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-primary rounded-full z-0"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
             )}
             <span className="relative z-10 flex items-center gap-2">
               <Library className="w-4 h-4 hidden sm:block" />
               <span>Memories</span>
             </span>
          </button>

          <button 
            onClick={() => onTabChange(Tab.PROFILE)}
            title="Switch to Profile View"
            className={`relative px-4 sm:px-6 py-3.5 rounded-full font-grotesk text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase transition duration-300 active:scale-[0.97] flex items-center gap-2 outline-none ${
                activeTab === Tab.PROFILE 
                ? 'text-bg font-extrabold' 
                : 'text-secondary hover:text-primary'
            }`}
          >
             {activeTab === Tab.PROFILE && (
              <motion.div 
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-primary rounded-full z-0"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
             )}
             <span className="relative z-10 flex items-center gap-2">
               <User className="w-4 h-4 hidden sm:block" />
               <span>Profile</span>
             </span>
          </button>

        </div>
      </div>
    </div>
  );
};