'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/src/components/shadcn-ui/dialog';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import { z } from 'zod';

export function AddDomainModal() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const invalidateDomains = platform.useUtils().org.mail.domains.getOrgDomains;

  const {
    mutateAsync: createNewDomain,
    error: domainError,
    isPending: isAddingDomain
  } = platform.org.mail.domains.createNewDomain.useMutation({
    onSuccess: () => {
      void invalidateDomains.invalidate();
      setOpen(false);
    }
  });

  const { data: canAddDomain, isLoading } =
    platform.org.iCanHaz.domain.useQuery(
      {
        orgShortcode: orgShortcode
      },
      {
        staleTime: 1000
      }
    );

  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (isAddingDomain) return;
        setOpen(!open);
      }}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>New Domain</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Domain</DialogTitle>
          <DialogDescription>Add a new Domain for your Org</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div>Loading...</div>
        ) : !canAddDomain ? (
          <div>
            Your Current Billing Plan does not allow you to add more domains.
          </div>
        ) : (
          <div className="my-2 flex w-fit flex-col gap-2">
            <Input
              label="Domain"
              name={'domain'}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />

            {domainError && (
              <div className="text-red-500">{domainError.message}</div>
            )}
            {inputError && <div className="text-red-500">{inputError}</div>}
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button>Cancel</Button>
              </DialogClose>
              <Button
                onClick={async () => {
                  if (
                    !z.string().min(3).includes('.').safeParse(domain).success
                  ) {
                    setInputError('Invalid Domain');
                    return;
                  }
                  setInputError(null);
                  await createNewDomain({
                    orgShortcode,
                    domainName: domain
                  });
                }}
                disabled={isAddingDomain}>
                Add Domain
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
