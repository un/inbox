import { Dialog, Flex, Button, Text, Spinner } from '@radix-ui/themes';
import useAwaitableModal from '@/hooks/use-awaitable-modal';
import { useEffect, useState } from 'react';
import { api } from '@/lib/trpc';
import useLoading from '@/hooks/use-loading';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint } from 'lucide-react';

export const passkeyModal = ({ username }: { username: string }) =>
  useAwaitableModal(({ open, onClose, onResolve }) => {
    const [state, setState] = useState<string | null>(null);

    const getPasskeyChallenge =
      api.useUtils().auth.passkey.signUpWithPasskeyStart;
    const verifyPasskeyChallenge =
      api.auth.passkey.signUpWithPasskeyFinish.useMutation();

    const { error, loading, run } = useLoading(async () => {
      setState('Getting a passkey challenge from server');
      const { options, publicId } = await getPasskeyChallenge.fetch({
        username
      });
      setState('Waiting for your passkey to respond');
      const passkeyData = await startRegistration(options).catch((e: Error) => {
        if (e.name === 'NotAllowedError') {
          e.message = 'Passkey verification was timed out or cancelled';
        }
        throw e;
      });
      setState("Verifying your passkey's response");
      await verifyPasskeyChallenge.mutateAsync({
        username,
        publicId,
        registrationResponseRaw: passkeyData
      });
      onResolve({});
    });

    useEffect(() => {
      if (error) {
        setState(error.message);
      }
    }, [error]);

    return (
      <Dialog.Root
        open={open}
        onOpenChange={() => {
          if (open) onClose();
        }}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>Sign up with Passkey</Dialog.Title>

          <Flex gap="2">
            <Spinner loading={loading && !error} />
            <Text
              as="div"
              size="2"
              mb="1"
              weight="bold">
              {state}
            </Text>
          </Flex>

          <Flex className="w-full p-2">
            <Button
              loading={loading}
              size="3"
              className="mx-auto"
              onClick={() => run()}>
              <Fingerprint size={20} />
              <Text>Use your Passkey</Text>
            </Button>
          </Flex>

          <Flex
            gap="3"
            mt="4"
            justify="end">
            <Button
              variant="soft"
              color="gray"
              onClick={() => onClose()}>
              Cancel
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    );
  });
