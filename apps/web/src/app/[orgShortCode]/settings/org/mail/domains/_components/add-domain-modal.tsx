'use client';

import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Input } from '@/src/components/shadcn-ui/input';
import { Button } from '@/src/components/shadcn-ui/button';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/src/components/shadcn-ui/dialog';
import { useState } from 'react';
import { isEnterpriseEdition } from '@/src/lib/utils';

export function AddDomainModal() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const invalidateDomains = api.useUtils().org.mail.domains.getOrgDomains;
  const isEE = isEnterpriseEdition();

  const { data: domainStatus, isLoading } =
    api.org.setup.billing.canAddDomain.useQuery(
      {
        orgShortCode
      },
      {
        enabled: isEE
      }
    );

  const {
    mutateAsync: createNewDomain,
    error: domainError,
    isPending: isAddingDomain
  } = api.org.mail.domains.createNewDomain.useMutation({
    onSuccess: () => {
      void invalidateDomains.invalidate();
      setOpen(false);
    }
  });

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
        ) : !isEE || domainStatus?.canAddDomain ? (
          <div className="my-2 flex w-fit flex-col gap-2">
            <div className="flex flex-col">
              <label
                htmlFor="domain"
                className="font-semibold">
                Domain
              </label>
              <Input
                name={'domain'}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
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
                    orgShortCode,
                    domainName: domain
                  });
                }}
                disabled={isAddingDomain}>
                Add Domain
              </Button>
            </div>
          </div>
        ) : (
          <div>
            Your Current Billing Plan does not allow you to add more domains.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
