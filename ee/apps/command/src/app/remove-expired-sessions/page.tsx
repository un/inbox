'use client';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Page() {
  const { isPending, error, mutateAsync } =
    api.internal.removeExpiredSessions.useMutation({
      onSuccess: (data) => {
        toast.success(`Removed ${data.count} expired sessions`);
      },
      onError: (error) => {
        toast.error(error.message);
      }
    });

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Remove Expired Sessions</h1>
      <div className="flex w-fit gap-2">
        <Button
          onClick={() => mutateAsync()}
          disabled={isPending}>
          {isPending ? 'Removing Sessions...' : 'Remove Expired Sessions'}
        </Button>
      </div>
      {error && <div className="text-red-500">{error.message}</div>}
    </div>
  );
}
