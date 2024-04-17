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
import Stepper from './Stepper';
import { Check, Plus, Info } from 'lucide-react';
import { useDebounceCallback } from 'usehooks-ts';
import { api } from '@/lib/trpc';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { zodSchemas } from '@u22n/utils';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Page() {
  const username = useRef('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameData, setUsernameData] = useState<{
    available: boolean;
    error: string | null;
  }>({
    available: false,
    error: null
  });
  const [hasData, setHasData] = useState(false);
  const [agree, setAgree] = useState(false);
  const cookies = useCookies();
  const router = useRouter();

  const checkUsernameApi = api.useUtils().auth.signup.checkUsernameAvailability;

  const checkUsername = useDebounceCallback(
    async (username: string) => {
      const parsed = zodSchemas.username().safeParse(username);
      if (!parsed.success) {
        setUsernameData({
          error: parsed.error.issues[0]?.message ?? null,
          available: false
        });
        setHasData(true);
        return;
      }

      setUsernameLoading(true);
      await checkUsernameApi
        .fetch({ username })
        .then((data) => {
          setUsernameData(data);
        })
        .catch((error: Error) => {
          toast.error(error.message);
        })
        .finally(() => setUsernameLoading(false));
      setHasData(true);
    },
    1000,
    { maxWait: 7500 }
  );

  function nextStep() {
    cookies.set('un-join-username', username.current);
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
          onChange={(e) => {
            username.current = e.target.value;
            setHasData(false);
            if (!username.current) return;
            void checkUsername(username.current);
          }}
          color={
            hasData ? (usernameData.available ? 'green' : 'red') : undefined
          }>
          <TextField.Slot />
          <TextField.Slot>
            <Tooltip content="Can contain only letters, numbers, dots, hyphens and underscore">
              <Info size={16} />
            </Tooltip>
          </TextField.Slot>
        </TextField.Root>

        {!hasData && usernameLoading && (
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

        {hasData && !usernameLoading && (
          <Flex
            align="center"
            gap="1">
            {usernameData.available ? (
              <Check
                size={16}
                className="stroke-green-11"
              />
            ) : (
              <Plus
                size={16}
                className="stroke-red-11 rotate-45"
              />
            )}

            <Text
              className={
                !usernameData.available ? 'text-red-11' : 'text-green-11'
              }
              weight="bold"
              size="2">
              {usernameData.available ? 'Looks good!' : usernameData.error}
            </Text>
          </Flex>
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
            disabled={!usernameData.available}
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
        disabled={!usernameData.available || !agree}
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
