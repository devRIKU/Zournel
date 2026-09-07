import React from 'react';
import { BookOpen, CheckSquare, User } from 'lucide-react';
import { Tab } from '../types';
import { FloatingDock, FloatingDockItem } from './ui/floating-dock';

export interface DockProps {
  currentTab: string | Tab;
  onSelectTab: (tab: string | Tab) => void;
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

export const ExpressiveDock: React.FC<DockProps> = ({ 
  currentTab, 
  onSelectTab,
  activeTab,
  onTabChange
}) => {
  const activeValue = currentTab || activeTab || 'todos';

  const isItemActive = (id: string, tabEnum: Tab) => {
    return activeValue === id || activeValue === tabEnum || 
           (id === 'todos' && (activeValue === 'todos' || activeValue === Tab.TODO)) ||
           (id === 'journal' && (activeValue === 'journal' || activeValue === Tab.JOURNAL)) ||
           (id === 'profile' && (activeValue === 'profile' || activeValue === Tab.PROFILE));
  };

  const handleSelect = (id: string, tabEnum: Tab) => {
    if (onTabChange) onTabChange(tabEnum);
    if (onSelectTab) onSelectTab(id);
  };

  const dockItems: FloatingDockItem[] = [
    {
      title: 'Tasks',
      icon: <CheckSquare className="w-5 h-5 stroke-[2.2]" />,
      onClick: () => handleSelect('todos', Tab.TODO),
      active: isItemActive('todos', Tab.TODO),
    },
    {
      title: 'Journal',
      icon: <BookOpen className="w-5 h-5 stroke-[2.2]" />,
      onClick: () => handleSelect('journal', Tab.JOURNAL),
      active: isItemActive('journal', Tab.JOURNAL),
    },
    {
      title: 'Profile',
      icon: <User className="w-5 h-5 stroke-[2.2]" />,
      onClick: () => handleSelect('profile', Tab.PROFILE),
      active: isItemActive('profile', Tab.PROFILE),
    },
  ];

  return (
    <FloatingDock items={dockItems} />
  );
};

export const BottomNav = ExpressiveDock;
export default ExpressiveDock;
