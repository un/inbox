import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription
} from '@/src/components/shadcn-ui/alert-dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/src/components/shadcn-ui/input-otp';
import { Button } from '@/src/components/shadcn-ui/button';
import { useRouter } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';

export function TwoFactorDialog({ open }: { open: boolean }) {
  const [code, setCode] = useState('');
  const router = useRouter();
  const {
    mutate: verifyTwoFactor,
    isSuccess,
    error,
    isPending
  } = platform.auth.twoFactorAuthentication.verifyTwoFactorChallenge.useMutation(
    {
      onSuccess: ({ defaultOrgSlug }) => {
        if (!defaultOrgSlug) {
          router.push('/join/org');
        } else {
          router.push(`/${defaultOrgSlug}`);
        }
      },
      onError: () => setCode('')
    }
  );

  return (
    <AlertDialog
      open={open}
      // don't close on any interaction
      onOpenChange={() => false}>
      <AlertDialogContent className="w-fit p-8">
        <AlertDialogTitle>Two Factor Authentication</AlertDialogTitle>
        <AlertDialogDescription>
          Enter the 6-digit code from your authenticator app
        </AlertDialogDescription>
        <div className="mx-auto w-fit">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e)}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        {error && (
          <div className="text-red-9 text-center text-xs">{error.message}</div>
        )}
        <Button
          className="mx-auto w-full"
          disabled={code.length !== 6 || isPending || isSuccess}
          loading={isPending || isSuccess}
          onClick={() => verifyTwoFactor({ twoFactorCode: code })}>
          {isSuccess ? 'Redirecting...' : isPending ? 'Verifying...' : 'Verify'}
        </Button>
      </AlertDialogContent>
    </AlertDialog>
  );
}
