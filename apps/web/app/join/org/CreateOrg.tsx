'use client';

import useLoading from '@/hooks/use-loading';
import { api } from '@/lib/trpc';
import {
  Button,
  Dialog,
  Flex,
  Spinner,
  Text,
  TextField
} from '@radix-ui/themes';
import { useDebounce } from '@uidotdev/usehooks';
import { Check, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
    api.useUtils().org.crud.checkShortcodeAvailability;
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
      orgShortcode: debouncedOrgShortCode
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
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) {
          setOrgName('');
          setOrgShortCode('');
          setCustomShortCode(false);
        }
      }}>
      <Dialog.Trigger>
        <Button
          size="3"
          className="flex-1"
          variant={hasInviteCode ? 'soft' : 'solid'}>
          <Plus size={20} />
          <Text className="whitespace-nowrap">Create a new Organization</Text>
        </Button>
      </Dialog.Trigger>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit py-4">
          Create a new organization
        </Dialog.Title>
        <Flex
          direction="column"
          gap="4">
          <label>
            <Text
              as="div"
              size="2"
              mb="1"
              weight="bold">
              Organization Name
            </Text>
            <TextField.Root
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </label>
          <label>
            <Text
              as="div"
              size="2"
              mb="1"
              weight="bold">
              Organization Short Code
            </Text>
            <TextField.Root
              value={orgShortCode}
              onChange={(e) => {
                setOrgShortCode(e.target.value);
                setCustomShortCode(true);
              }}
              color={
                orgShortCodeData
                  ? orgShortCodeData.available
                    ? 'green'
                    : 'red'
                  : undefined
              }
            />
          </label>
          {!orgShortCodeData && orgShortCodeDataLoading && (
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

          {orgShortCodeData && !orgShortCodeDataLoading && (
            <Flex
              align="center"
              gap="1">
              {orgShortCodeData.available ? (
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
                color={!orgShortCodeData.available ? 'red' : 'green'}
                weight="bold"
                size="2">
                {orgShortCodeData.available
                  ? 'Looks good!'
                  : orgShortCodeData.error}
              </Text>
            </Flex>
          )}

          {orgShortCodeError && !orgShortCodeDataLoading && (
            <Text
              color="red"
              weight="bold"
              size="2">
              {orgShortCodeError.message}
            </Text>
          )}

          {createOrgError && !createOrgLoading && (
            <Text
              color="red"
              weight="bold"
              size="2">
              {createOrgError.message}
            </Text>
          )}

          <Button
            disabled={!orgShortCodeData?.available}
            loading={createOrgLoading}
            size="2"
            className="mt-4"
            onClick={() => createOrg()}>
            Create My Organization
          </Button>
          <Dialog.Close>
            <Button
              variant="soft"
              color="gray"
              size="2">
              Cancel
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
