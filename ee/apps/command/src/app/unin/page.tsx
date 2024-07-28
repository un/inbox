'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/trpc';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Page() {
  const [username, setUsername] = useState<string>('');
  const { data, error, isLoading, refetch } =
    api.accounts.getAccountData.useQuery({ username }, { enabled: false });
  const { isPending, mutateAsync } = api.accounts.addUninOffer.useMutation({
    onSuccess: () => {
      toast.success('Unin offer added');
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Unin Offer</h1>
      <div className="flex w-fit gap-2">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter Username"
        />
        <Button
          onClick={() => refetch()}
          disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </div>
      {error && <div className="text-red-500">{error.message}</div>}
      {data && (
        <>
          <div className="whitespace-pre border p-2 font-mono">
            {JSON.stringify(data, null, 2)}
          </div>
          <Button
            onClick={async () => {
              if (!data.account) {
                toast.error('Account not found');
                return;
              }
              await mutateAsync({ username });
            }}
            disabled={isPending}
            className="w-fit">
            {isPending ? 'Adding Offer...' : 'Add Unin Offer'}
          </Button>
        </>
      )}
    </div>
  );
}
