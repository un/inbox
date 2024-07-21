'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Suspense, useState } from 'react';
import { serialize } from 'superjson';
import { toDataURL } from 'qrcode';
import { api } from '@/lib/trpc';
import Image from 'next/image';
import { toast } from 'sonner';

export default function Page() {
  const [username, setUsername] = useState<string>('');
  const { data, error, isLoading, refetch } =
    api.accounts.getFullAccountData.useQuery({ username }, { enabled: false });

  const {
    data: passwordData,
    mutateAsync: resetPassword,
    isPending: isPendingPassword
  } = api.accounts.resetPassword.useMutation({
    onSuccess: () => {
      toast.success('Password reset successful');
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const {
    data: twoFaData,
    isPending: isPending2Fa,
    mutateAsync: reset2Fa
  } = api.accounts.reset2fa.useMutation({
    onSuccess: () => {
      toast.success('2FA reset successful');
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="flex flex-col gap-4 p-4 pb-4">
      <h1 className="text-2xl font-bold">Password & 2FA Reset</h1>
      <div className="flex w-fit gap-2">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter Username"
        />
        <Button
          onClick={() => refetch()}
          disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </div>
      {error && <div className="text-red-500">{error.message}</div>}
      {data && (
        <>
          <div className="whitespace-pre border p-2 font-mono">
            {JSON.stringify(serialize(data).json, null, 2)}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                if (!data.account) {
                  toast.error('Account not found');
                  return;
                }
                const sure = confirm(
                  `You are about to reset the password for ${username}. Are you sure?`
                );
                if (!sure) return;
                await resetPassword({ username });
              }}
              disabled={isPendingPassword}
              className="w-fit">
              {isPendingPassword ? 'Resetting Password...' : 'Reset Password'}
            </Button>
            <Button
              onClick={async () => {
                const sure = confirm(
                  `You are about to reset the 2FA for ${username}. Are you sure?`
                );
                if (!sure) return;
                await reset2Fa({ username });
              }}
              disabled={isPending2Fa}
              className="w-fit">
              {isPending2Fa ? 'Resetting 2FA...' : 'Reset 2FA'}
            </Button>
          </div>
        </>
      )}
      {passwordData && (
        <div>
          New Password:{' '}
          <span className="select-all border p-2 font-mono">
            {passwordData.newPassword}
          </span>
        </div>
      )}
      {twoFaData && (
        <div>
          2FA URI:{' '}
          <span className="select-all border p-2 font-mono">
            {twoFaData.uri}
          </span>
          <Suspense fallback={<div>Loading QR code...</div>}>
            <QRCode text={twoFaData.uri} />
          </Suspense>
        </div>
      )}
    </div>
  );
}

async function QRCode({ text }: { text: string }) {
  const src = await toDataURL(text);
  return (
    <Image
      src={src}
      className="rounded py-4"
      alt="URI QR Code"
      width={200}
      height={200}
    />
  );
}
