'use client';

import {
  Button,
  Flex,
  Spinner,
  Text,
  TextField,
  Tooltip,
  Checkbox
} from '@radix-ui/themes';
import Stepper from './_components/stepper';
import { Check, Plus, Info } from 'lucide-react';
import { useDebounce } from '@uidotdev/usehooks';
import { api } from '@/src/lib/trpc';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { zodSchemas } from '@u22n/utils';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useLoading from '@/src/hooks/use-loading';

export default function Page() {
  const [username, setUsername] = useState<string>();
  const [agree, setAgree] = useState(false);
  const cookies = useCookies();
  const router = useRouter();
  const checkUsernameApi = api.useUtils().auth.signup.checkUsernameAvailability;
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
    cookies.set('un-join-username', username);
    router.push('/join/secure');
  }

  return (
    <Flex
      direction="column"
      gap="3"
      className="mx-auto w-full max-w-[560px] px-4">
      <Text
        mt="3"
        size="4"
        weight="bold">
        Choose Your Username
      </Text>
      <Stepper
        step={1}
        total={4}
      />
      <Flex
        direction="column"
        gap="1">
        <Text
          size="3"
          className="text-pretty"
          weight="medium">
          This will be your username across the whole Un ecosystem.
        </Text>
        <Text
          size="3"
          className="text-pretty"
          weight="medium">
          It&apos;s yours personally and can join as many organizations as you
          want.
        </Text>
      </Flex>
      <Flex
        direction="column"
        align="start"
        className="py-4"
        gap="1">
        <Text
          size="3"
          weight="bold">
          Username
        </Text>

        <TextField.Root
          className="w-full"
          onChange={(e) => setUsername(e.target.value)}
          color={
            usernameData
              ? usernameData.available
                ? 'green'
                : 'red'
              : undefined
          }>
          <TextField.Slot />
          <TextField.Slot>
            <Tooltip content="Can contain only letters, numbers, dots, hyphens and underscore">
              <Info size={16} />
            </Tooltip>
          </TextField.Slot>
        </TextField.Root>

        {!usernameData && usernameLoading && (
          <Flex
            align="center"
            gap="1">
            <Spinner loading />
            <Text
              weight="bold"
              size="2">
              Checking...
            </Text>
          </Flex>
        )}

        {usernameData && !usernameLoading && (
          <Flex
            align="center"
            gap="1">
            {usernameData.available ? (
              <Check
                size={16}
                className="stroke-green-10"
              />
            ) : (
              <Plus
                size={16}
                className="stroke-red-10 rotate-45"
              />
            )}

            <Text
              color={!usernameData.available ? 'red' : 'green'}
              weight="bold"
              size="2">
              {usernameData.available ? 'Looks good!' : usernameData.error}
            </Text>
          </Flex>
        )}

        {usernameError && !usernameLoading && (
          <Text
            color="red"
            weight="bold"
            size="2">
            {usernameError.message}
          </Text>
        )}
      </Flex>

      <Text
        as="label"
        size="2"
        className="mx-auto py-3">
        <Flex
          as="span"
          gap="2">
          <Checkbox
            size="1"
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
        </Flex>
      </Text>

      <Button
        disabled={!usernameData?.available || !agree}
        onClick={nextStep}>
        I like it!
      </Button>
      <Button
        variant="ghost"
        my="2"
        className="mx-auto w-fit p-2">
        <Link href="/">Sign in instead</Link>
      </Button>
    </Flex>
  );
}
