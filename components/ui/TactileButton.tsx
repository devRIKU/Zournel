import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tonal';
}

export const TactileButton: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  className = '', 
  ...props 
}) => {
  const base = "relative inline-flex items-center justify-center font-medium transition-all duration-100 ease-out select-none active:translate-y-[1.5px] rounded-2xl px-4 py-2.5 text-sm";
  
  const variants = {
    primary: "bg-amber-600 text-white shadow-[0_3px_0_0_#b45309,0_4px_6px_rgba(0,0,0,0.15)] active:shadow-[0_1px_0_0_#b45309,0_2px_4px_rgba(0,0,0,0.1)] border-t border-amber-400/30",
    secondary: "bg-surface-low text-neutral-800 dark:text-neutral-100 border border-neutral-200/70 dark:border-neutral-700/60 shadow-tactile-card dark:shadow-tactile-card-dark active:shadow-inner",
    tonal: "bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/50 dark:border-amber-800/40 hover:bg-amber-100",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
