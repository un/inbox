import { Separator } from '@/src/components/shadcn-ui/separator';
import { cn } from '@/src/lib/utils';

export default function Stepper({
  step,
  total
}: {
  step: number;
  total: number;
}) {
  return (
    <div className="mx-auto flex w-full max-w-96 items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <Separator
          key={i}
          className={cn(
            'my-4 h-2 flex-1 rounded-md',
            i < step ? 'bg-grass-6' : 'bg-gray-6'
          )}
        />
      ))}
    </div>
  );
}
