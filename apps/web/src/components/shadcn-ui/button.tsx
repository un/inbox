import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { SpinnerGap } from '@phosphor-icons/react';
import { cn } from '@/src/lib/utils';

//! This component has been modified from the original version in the shadcn-ui package

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 ring-base-5',
  {
    variants: {
      variant: {
        default: 'bg-accent-9 text-base-1 hover:bg-accent-10',
        destructive: 'bg-red-9 text-base-1 hover:bg-red-10',
        outline:
          'border border-base-6 border-base-7 hover:border-base-8 bg-base-1 hover:bg-base-3 hover:text-base-12 text-base-11',
        secondary: 'bg-base-3 text-secondary-foreground hover:bg-base-4',
        ghost: 'hover:bg-accent hover:text-accent-9',
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
    const isIcon = size === 'icon' || size === 'icon-sm';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
        disabled={loading || disabled}>
        {loading ? (
          <div className="flex items-center justify-center">
            <SpinnerGap
              className={cn('animate-spin', isIcon ? 'size-4' : 'mr-1 size-5')}
            />{' '}
            {isIcon ? <span className="sr-only">{children}</span> : children}
          </div>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
