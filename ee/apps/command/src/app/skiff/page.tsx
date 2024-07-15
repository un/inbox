'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { platform } from '@/lib/trpc';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Page() {
  const [orgShortCode, setOrgShortCode] = useState<string>('');
  const { data, error, isLoading, refetch } = platform.orgs.getOrgData.useQuery(
    { orgShortCode },
    { enabled: false }
  );
  const { isPending, mutateAsync } = platform.orgs.addSkiffOffer.useMutation({
    onSuccess: () => {
      toast.success('Skiff offer added');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Skiff Offer</h1>
      <div className="flex w-fit gap-2">
        <Input
          value={orgShortCode}
          onChange={(e) => setOrgShortCode(e.target.value)}
          placeholder="Enter Org Shortcode"
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
              if (!data.org) {
                toast.error('Org not found');
                return;
              }
              await mutateAsync({ orgId: data.org?.id });
            }}
            disabled={isPending}
            className="w-fit">
            {isPending ? 'Adding Offer...' : 'Add Skiff Offer'}
          </Button>
        </>
      )}
    </div>
  );
}
