import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/src/lib/utils';
import { SpinnerGap } from '@phosphor-icons/react';

//! This component has been modified from the original version in the shadcn-ui package

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 ring-base-5',
  {
    variants: {
      variant: {
        default: 'bg-accent-9 text-base-1 hover:bg-accent-10',
        destructive: 'bg-red-9 text-base-1 hover:bg-red-10',
        outline:
          'border border-input border-base-7 hover:border-base-8 bg-base-1 hover:bg-base-3 hover:text-base-12 text-base-11',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        child: ''
      },
      size: {
        default: 'h-10 px-4 py-2 rounded-lg',
        xs: 'h-8 rounded-lg px-2.5',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-lg px-8',
        icon: 'min-h-8 min-w-8 w-8 h-8 rounded-lg',
        'icon-sm': 'min-h-6 min-w-6 w-6 h-6 rounded-md'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

interface AdditionButtonProps {
  loading?: boolean;
}

export interface ButtonProps
  extends AdditionButtonProps,
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      children,
      disabled,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
        disabled={disabled ?? loading}>
        {loading ? (
          <>
            <SpinnerGap className="mr-1 h-5 w-5 animate-spin" /> {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
