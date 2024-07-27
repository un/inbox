'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { toast } from 'sonner';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [verificationCode, setVerificationCode] = useState(
    searchParams.get('code') ?? ''
  );

  const {
    mutateAsync: verifyRecoveryEmail,
    isPending: isVerifying,
    data: isVerified
  } = platform.account.security.verifyRecoveryEmail.useMutation({
    onSuccess: () => {
      toast.success('Recovery email verified successfully');
    },
    onError: (error: unknown) => {
      toast.error('Failed to verify recovery email', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-4 text-2xl font-bold">Verify Recovery Email</h1>
      {isVerified ? (
        <>
          <p className="mb-4 text-sm text-gray-600">
            Your email has been successfully verified.
          </p>
          <Link
            href="/"
            passHref>
            <Button className="w-full max-w-xs">Return to Homepage</Button>
          </Link>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void verifyRecoveryEmail({ verificationCode });
          }}
          className="w-full max-w-xs">
          <p className="mb-4 text-sm text-gray-600">
            Please enter the verification code sent to your recovery email.
          </p>
          <Input
            inputSize="lg"
            label="Verification Code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          <Button
            type="submit"
            loading={isVerifying}
            disabled={verificationCode.length !== 32}
            className="w-full">
            {isVerifying ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>
      )}
    </div>
  );
}
