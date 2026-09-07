import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-accent-fg shadow-xs hover:opacity-90 active:scale-[0.98]',
        destructive:
          'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shadow-xs hover:bg-red-500/20 active:scale-[0.98]',
        outline:
          'border border-surface-highlight bg-transparent shadow-xs hover:bg-surface-highlight/60 text-primary active:scale-[0.98]',
        secondary:
          'bg-surface-high text-primary border border-surface-highlight shadow-xs hover:bg-surface-highest active:scale-[0.98]',
        ghost:
          'hover:bg-surface-highlight/70 text-secondary hover:text-primary active:scale-[0.98]',
        link: 'text-accent underline-offset-4 hover:underline',
        tonal:
          'bg-accent/15 hover:bg-accent/25 text-accent border border-accent/25 active:scale-[0.98]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8 text-base font-semibold',
        icon: 'h-9 w-9 p-2',
        pill: 'h-9 px-4 rounded-full text-xs font-bold tracking-wider uppercase',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

