import { Check } from '@phosphor-icons/react';
import { cn } from '@/src/lib/utils';

export default function Stepper({
  step,
  total
}: {
  step: number;
  total: number;
}) {
  return (
    <div className="flex gap-1">
      <span className="sr-only">{`This is step ${step} of ${total}`}</span>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'text-base-11 bg-base-1 border-base-7 flex h-5 w-5 select-none items-center justify-center rounded-full border text-center text-xs font-semibold',
            step === i + 1 && 'bg-accent-9 text-base-1 border-none',
            step > i + 1 && 'bg-green-9 text-base-1 border-none'
          )}>
          {step > i + 1 ? (
            <Check
              size={12}
              weight="bold"
            />
          ) : (
            i + 1
          )}
        </div>
      ))}
    </div>
  );
}
