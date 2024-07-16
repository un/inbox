'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';
import { Button } from '@/src/components/shadcn-ui/button';
import { Checkbox } from '@/src/components/shadcn-ui/checkbox';
import Stepper from './_components/stepper';
import { Check, Plus, Info } from '@phosphor-icons/react';
import { useDebounce } from '@uidotdev/usehooks';
import { platform } from '@/src/lib/trpc';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { zodSchemas } from '@u22n/utils/zodSchemas';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useLoading from '@/src/hooks/use-loading';
import { Input } from '@/src/components/shadcn-ui/input';
import { cn } from '@/src/lib/utils';
import { Label } from '@/src/components/shadcn-ui/label';
import { datePlus } from '@u22n/utils/ms';

export default function Page() {
  const [username, setUsername] = useState<string>();
  const [agree, setAgree] = useState(false);
  const cookies = useCookies();
  const router = useRouter();
  const checkUsernameApi =
    platform.useUtils().auth.signup.checkUsernameAvailability;
  const debouncedUsername = useDebounce(username, 1000);

  const {
    loading: usernameLoading,
    data: usernameData,
    error: usernameError,
    run: checkUsername
  } = useLoading(async (signal) => {
    if (!debouncedUsername) return;
    const parsed = zodSchemas.username().safeParse(debouncedUsername);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? null,
        available: false
      };
    }
    return await checkUsernameApi.fetch(
      { username: debouncedUsername },
      { signal }
    );
  });

  useEffect(() => {
    if (typeof debouncedUsername === 'undefined') return;
    checkUsername({ clearData: true, clearError: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUsername]);

  useEffect(() => {
    if (usernameError) {
      toast.error(usernameError.message);
    }
  }, [usernameError]);

  function nextStep() {
    if (!username) return;
    cookies.set('un-join-username', username, {
      expires: datePlus('15 minutes')
    });
    router.push('/join/secure');
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4">
      <span className="text-bold mt-3 text-lg font-bold">
        Choose Your Username
      </span>
      <Stepper
        step={1}
        total={4}
      />
      <div className="flex flex-col gap-1">
        <span className="text-pretty font-medium">
          This will be your username across the whole Un ecosystem.
        </span>
        <span className="text-pretty font-medium">
          It&apos;s yours personally and can join as many organizations as you
          want.
        </span>
      </div>
      <div className="flex-col items-start gap-2 py-4 text-start">
        <span className="text-sm font-bold">Username</span>
        <div className="flex">
          <Input
            className="w-full"
            onChange={(e) => setUsername(e.target.value)}
          />
          <Tooltip>
            <TooltipTrigger className="p-2">
              <Info size={20} />
            </TooltipTrigger>
            <TooltipContent>
              Username can only contain letters, numbers, and underscores.
            </TooltipContent>
          </Tooltip>
        </div>

        {!usernameData && usernameLoading && (
          <div className="text-muted-foreground text-sm font-bold">
            Checking...
          </div>
        )}

        {usernameData && !usernameLoading && (
          <div className="flex items-center gap-1">
            {usernameData.available ? (
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
                usernameData.available ? 'text-green-10' : 'text-red-10'
              )}>
              {usernameData.available ? 'Looks good!' : usernameData.error}
            </div>
          </div>
        )}

        {usernameError && !usernameLoading && (
          <div className="text-red-10 text-sm font-bold">
            {usernameError.message}
          </div>
        )}
      </div>

      <Label className="mx-auto py-3">
        <div className="flex gap-2">
          <Checkbox
            checked={agree}
            onCheckedChange={(e) => setAgree(!!e)}
            disabled={!usernameData?.available}
          />
          <span>
            I agree to the UnInbox{' '}
            <a
              href="https://legal.u22n.com/uninbox/terms"
              target="_blank"
              className="underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="https://legal.u22n.com/uninbox/privacy"
              target="_blank"
              className="underline">
              Privacy Policy
            </a>
            .
          </span>
        </div>
      </Label>

      <Button
        disabled={!usernameData?.available || !agree}
        onClick={nextStep}>
        I like it!
      </Button>
      <Button
        variant="link"
        className="mx-auto my-2 w-fit p-2">
        <Link href="/">Sign in instead</Link>
      </Button>
    </div>
  );
}
