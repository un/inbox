'use client';

import useLoading from '@/src/hooks/use-loading';
import { platform } from '@/src/lib/trpc';
import { Button } from '@/src/components/shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
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
  const [orgShortcode, setOrgShortcode] = useState('');
  const [customShortcode, setCustomShortcode] = useState(false);
  const router = useRouter();

  const debouncedOrgShortcode = useDebounce(orgShortcode, 1000);
  const checkOrgShortcodeApi =
    platform.useUtils().org.crud.checkShortcodeAvailability;
  const createOrgApi = platform.org.crud.createNewOrg.useMutation();

  const {
    loading: orgShortcodeDataLoading,
    data: orgShortcodeData,
    error: orgShortcodeError,
    run: checkOrgShortcode
  } = useLoading(async (signal) => {
    if (!debouncedOrgShortcode) return;
    const parsed = z
      .string()
      .min(5)
      .max(64)
      .regex(/^[a-z0-9]*$/, {
        message: 'Only lowercase letters and numbers'
      })
      .safeParse(debouncedOrgShortcode);

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? null,
        available: false
      };
    }
    return await checkOrgShortcodeApi.fetch(
      { shortcode: debouncedOrgShortcode },
      { signal }
    );
  });

  const {
    loading: createOrgLoading,
    error: createOrgError,
    run: createOrg
  } = useLoading(async () => {
    if (!orgShortcodeData?.available) return;
    await createOrgApi.mutateAsync({
      orgName,
      orgShortcode: debouncedOrgShortcode
    });
    toast.success('Organization created successfully.');
    router.push(`/join/profile?org=${debouncedOrgShortcode}`);
  });

  useEffect(() => {
    if (customShortcode) return;
    setOrgShortcode(orgName?.toLowerCase().replace(/[^a-z0-9]/g, '') || '');
  }, [orgName, customShortcode]);

  useEffect(() => {
    checkOrgShortcode({ clearData: true, clearError: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedOrgShortcode]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setOrgName('');
          setOrgShortcode('');
          setCustomShortcode(false);
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
              value={orgShortcode}
              onChange={(e) => {
                setOrgShortcode(e.target.value);
                setCustomShortcode(true);
              }}
            />
          </label>
          {!orgShortcodeData && orgShortcodeDataLoading && (
            <div className="text-muted-foreground text-sm font-bold">
              Checking...
            </div>
          )}

          {orgShortcodeData && !orgShortcodeDataLoading && (
            <div className="flex items-center gap-1">
              {orgShortcodeData.available ? (
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
                  orgShortcodeData.available ? 'text-green-10' : 'text-red-10'
                )}>
                {orgShortcodeData.available
                  ? 'Looks good!'
                  : orgShortcodeData.error}
              </div>
            </div>
          )}

          {orgShortcodeError && !orgShortcodeDataLoading && (
            <div className="text-red-10 text-sm font-bold">
              {orgShortcodeError.message}
            </div>
          )}

          {createOrgError && !createOrgLoading && (
            <div className="text-red-10 text-sm font-bold">
              {createOrgError.message}
            </div>
          )}

          <Button
            disabled={!orgShortcodeData?.available || createOrgLoading}
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
    </Dialog>
  );
}
