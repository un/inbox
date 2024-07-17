import { cn } from '@/src/lib/utils';
import { SpinnerBall } from '@phosphor-icons/react/dist/ssr';
import { type HTMLAttributes } from 'react';

export function LoadingSpinner({
  spinnerSize = 24,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { spinnerSize?: number }) {
  return (
    <div
      {...props}
      className={cn(
        'flex h-full w-full items-center justify-center rounded border',
        className
      )}>
      <SpinnerBall
        size={spinnerSize}
        className="animate-spin"
      />
    </div>
  );
}
