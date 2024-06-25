'use client';

import useLoading from '@/src/hooks/use-loading';
import { api } from '@/src/lib/trpc';
import { Button } from '@/src/components/shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogPortal,
  DialogTitle,
  DialogClose
} from '@/src/components/shadcn-ui/dialog';
import { useDebounce } from '@uidotdev/usehooks';
import { Check, Plus } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/src/components/shadcn-ui/input';
import { cn } from '@/src/lib/utils';

export default function CreateOrgButton({
  hasInviteCode
}: {
  hasInviteCode: boolean;
}) {
  const [orgName, setOrgName] = useState('');
  const [orgShortCode, setOrgShortCode] = useState('');
  const [customShortCode, setCustomShortCode] = useState(false);
  const router = useRouter();

  const debouncedOrgShortCode = useDebounce(orgShortCode, 1000);
  const checkOrgShortCodeApi =
    api.useUtils().org.crud.checkShortCodeAvailability;
  const createOrgApi = api.org.crud.createNewOrg.useMutation();

  const {
    loading: orgShortCodeDataLoading,
    data: orgShortCodeData,
    error: orgShortCodeError,
    run: checkOrgShortCode
  } = useLoading(async (signal) => {
    if (!debouncedOrgShortCode) return;
    const parsed = z
      .string()
      .min(5)
      .max(64)
      .regex(/^[a-z0-9]*$/, {
        message: 'Only lowercase letters and numbers'
      })
      .safeParse(debouncedOrgShortCode);

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? null,
        available: false
      };
    }
    return await checkOrgShortCodeApi.fetch(
      { shortcode: debouncedOrgShortCode },
      { signal }
    );
  });

  const {
    loading: createOrgLoading,
    error: createOrgError,
    run: createOrg
  } = useLoading(async () => {
    if (!orgShortCodeData?.available) return;
    await createOrgApi.mutateAsync({
      orgName,
      orgShortCode: debouncedOrgShortCode
    });
    toast.success('Organization created successfully.');
    router.push(`/join/profile?org=${debouncedOrgShortCode}`);
  });

  useEffect(() => {
    if (customShortCode) return;
    setOrgShortCode(orgName?.toLowerCase().replace(/[^a-z0-9]/g, '') || '');
  }, [orgName, customShortCode]);

  useEffect(() => {
    checkOrgShortCode({ clearData: true, clearError: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedOrgShortCode]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setOrgName('');
          setOrgShortCode('');
          setCustomShortCode(false);
        }
      }}>
      <DialogTrigger asChild>
        <Button
          className="flex-1 gap-1"
          variant={hasInviteCode ? 'outline' : 'default'}>
          <Plus size={20} />
          <span className="whitespace-nowrap">Create a new Organization</span>
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogContent>
          <DialogTitle>Create a new organization</DialogTitle>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <div className="text-sm font-bold">Organization Name</div>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </label>
            <label>
              <div className="text-sm font-bold">Organization Short Code</div>
              <Input
                value={orgShortCode}
                onChange={(e) => {
                  setOrgShortCode(e.target.value);
                  setCustomShortCode(true);
                }}
              />
            </label>
            {!orgShortCodeData && orgShortCodeDataLoading && (
              <div className="text-muted-foreground text-sm font-bold">
                Checking...
              </div>
            )}

            {orgShortCodeData && !orgShortCodeDataLoading && (
              <div className="flex items-center gap-1">
                {orgShortCodeData.available ? (
                  <Check
                    size={16}
                    className="text-green-10"
                  />
                ) : (
                  <Plus
                    size={16}
                    className="text-red-10 rotate-45"
                  />
                )}

                <div
                  className={cn(
                    'text-sm font-bold',
                    orgShortCodeData.available ? 'text-green-10' : 'text-red-10'
                  )}>
                  {orgShortCodeData.available
                    ? 'Looks good!'
                    : orgShortCodeData.error}
                </div>
              </div>
            )}

            {orgShortCodeError && !orgShortCodeDataLoading && (
              <div className="text-red-10 text-sm font-bold">
                {orgShortCodeError.message}
              </div>
            )}

            {createOrgError && !createOrgLoading && (
              <div className="text-red-10 text-sm font-bold">
                {createOrgError.message}
              </div>
            )}

            <Button
              disabled={!orgShortCodeData?.available || createOrgLoading}
              loading={createOrgLoading}
              className="mt-4"
              onClick={() => createOrg()}>
              Create My Organization
            </Button>
            <DialogClose asChild>
              <Button
                variant="outline"
                className="w-full">
                Cancel
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
