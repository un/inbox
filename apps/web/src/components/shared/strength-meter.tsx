import { type ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

export function StrengthMeter({
  message = null,
  strength = 0,
  error = false
}: {
  strength?: number;
  message?: ReactNode;
  error?: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-1 p-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-base-11">Strength:</span>
        {message}
      </div>
      <div className="flex h-1 items-center justify-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full',
              error ? 'bg-red-9' : i < strength ? 'bg-green-9' : 'bg-base-5'
            )}
          />
        ))}
      </div>
    </div>
  );
}
