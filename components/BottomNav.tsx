import React from 'react';
import { Tab } from '../types';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  // Props onAddClick and onSettingsClick removed from here as they moved
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full z-40 pointer-events-none pb-8">
      <div className="w-full flex justify-center items-end px-4">
        <div className="pointer-events-auto flex items-center bg-surface/80 backdrop-blur-xl shadow-xl shadow-black/5 rounded-full p-1.5 border border-surface-highlight">
          
          <button 
            onClick={() => onTabChange(Tab.TODO)}
            className={`px-8 py-3 rounded-full font-grotesk text-sm font-bold tracking-widest uppercase transition-all duration-300 ${
                activeTab === Tab.TODO 
                ? 'bg-primary text-bg shadow-md' 
                : 'text-secondary hover:text-primary hover:bg-surface-highlight'
            }`}
          >
            Tasks
          </button>

          <button 
            onClick={() => onTabChange(Tab.JOURNAL)}
            className={`px-8 py-3 rounded-full font-grotesk text-sm font-bold tracking-widest uppercase transition-all duration-300 ${
                activeTab === Tab.JOURNAL 
                ? 'bg-primary text-bg shadow-md' 
                : 'text-secondary hover:text-primary hover:bg-surface-highlight'
            }`}
          >
             Journal
          </button>

        </div>
      </div>
    </div>
  );
};
