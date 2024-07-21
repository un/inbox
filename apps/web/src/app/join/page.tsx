'use client';

import { At, Check, Plus, SpinnerGap } from '@phosphor-icons/react';
import { Checkbox } from '@/src/components/shadcn-ui/checkbox';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { Label } from '@/src/components/shadcn-ui/label';
import { useEffect, useMemo, useState } from 'react';
import { zodSchemas } from '@u22n/utils/zodSchemas';
import { useCookies } from 'next-client-cookies';
import { useDebounce } from '@uidotdev/usehooks';
import Stepper from './_components/stepper';
import { useRouter } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { datePlus } from '@u22n/utils/ms';
import Image from 'next/image';

export default function Page() {
  const [username, setUsername] = useState<string>('');
  const [agree, setAgree] = useState(false);
  const router = useRouter();
  const debouncedUsername = useDebounce(username, 1000);
  const cookies = useCookies();

  const [validUsername, usernameError] = useMemo(() => {
    const { success, error } = zodSchemas
      .username()
      .safeParse(debouncedUsername);
    return [
      success,
      error ? new Error(error.issues.map((i) => i.message).join(', ')) : null
    ];
  }, [debouncedUsername]);

  const { data, isLoading, error } =
    platform.auth.signup.checkUsernameAvailability.useQuery(
      {
        username: debouncedUsername
      },
      {
        enabled: validUsername
      }
    );

  // Load username from cookie if available
  useEffect(() => {
    const cookieUsername = cookies.get('un-join-username');
    if (cookieUsername) setUsername(cookieUsername);
  }, [cookies]);

  return (
    <div className="mx-auto flex w-full max-w-[416px] flex-col gap-5 p-2">
      <div className="flex items-center justify-between">
        <Image
          src="/logo.png"
          alt="UnInbox Logo"
          height={40}
          width={40}
          className="rounded-xl"
        />
        <Stepper
          step={1}
          total={4}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-base-12 text-2xl font-medium">
          Choose your username
        </div>

        <span className="text-base-11 text-pretty text-base">
          This will be your username across the whole Un ecosystem. It&apos;s
          yours personally and can join as many organizations as you want.
        </span>
      </div>
      <div className="flex flex-col gap-4 pt-3">
        <div className="flex-col items-start gap-1 text-start">
          <Input
            label="Username"
            inputSize="lg"
            autoComplete="new-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            leadingSlot={At}
            trailingSlot={() => {
              if (!debouncedUsername) return null;
              return isLoading ? (
                <SpinnerGap
                  className="h-4 w-4 animate-spin"
                  size={12}
                />
              ) : usernameError ?? error ? (
                <Plus
                  size={16}
                  className="text-red-10 rotate-45"
                  weight="bold"
                />
              ) : data && !isLoading ? (
                data.available ? (
                  <Check
                    size={16}
                    className="text-green-10"
                    weight="bold"
                  />
                ) : (
                  <Plus
                    size={16}
                    className="text-red-10 rotate-45"
                    weight="bold"
                  />
                )
              ) : null;
            }}
            hint={
              debouncedUsername
                ? isLoading
                  ? { message: 'Checking username...' }
                  : usernameError
                    ? {
                        type: 'error',
                        message: usernameError.message
                      }
                    : data && !isLoading
                      ? {
                          type: data.available ? 'success' : 'error',
                          message: data.available
                            ? 'Looks good!'
                            : data.error ?? 'Username is not available'
                        }
                      : error
                        ? {
                            type: 'error',
                            message: error.message
                          }
                        : { message: '' }
                : { message: '' }
            }
          />
        </div>

        <div className="flex gap-2">
          <Checkbox
            checked={agree}
            onCheckedChange={(e) => setAgree(!!e)}
            id="agree"
          />
          <Label
            htmlFor="agree"
            className="text-base-11 text-xs">
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
          </Label>
        </div>

        <Button
          disabled={
            !debouncedUsername || !agree || !data?.available || isLoading
          }
          onClick={() => {
            cookies.set('un-join-username', debouncedUsername, {
              expires: datePlus('15 minutes')
            });
            router.push('/join/secure');
          }}>
          Claim username
        </Button>
      </div>
    </div>
  );
}
