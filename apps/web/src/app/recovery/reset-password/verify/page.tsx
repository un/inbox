'use client';

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/src/components/shadcn-ui/input-otp';
import { Button } from '@/src/components/shadcn-ui/button';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { useRouter } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import { toast } from 'sonner';

export default function VerifyResetPage() {
  const [verificationCode, setVerificationCode] = useState('');
  const router = useRouter();

  const { mutate: verifyRecoveryCode, isPending } =
    platform.auth.recovery.verifyRecoveryCode.useMutation({
      onSuccess: (result) => {
        if (result.success) {
          toast.success('Verification successful.');
          router.push(`/recovery/reset-password/reset?token=${result.token}`);
        } else {
          toast.error('Invalid verification code. Please try again.');
        }
      },
      onError: () => {
        toast.error('An error occurred. Please try again.');
      }
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyRecoveryCode({ code: verificationCode });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-4 text-2xl font-bold">Verify Reset Code</h1>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col items-center justify-center space-y-4">
        <div className="space-y-4">
          <label
            htmlFor="verificationCode"
            className="block text-center text-sm font-medium text-gray-700">
            Enter your 6-digit verification code
          </label>
          <InputOTP
            value={verificationCode}
            onChange={setVerificationCode}
            pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
            maxLength={6}
            className="mt-1">
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
        <Button
          type="submit"
          disabled={verificationCode.length !== 6}
          loading={isPending}>
          {isPending ? 'Verifying...' : 'Verify Code'}
        </Button>
      </form>
    </div>
  );
}
