'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { toast } from 'sonner';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const { mutateAsync: verifyRecoveryEmail } =
    platform.account.security.verifyRecoveryEmail.useMutation();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setVerificationCode(code);
    }
  }, [searchParams]);

  const handleVerify = async () => {
    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsVerifying(true);
    try {
      await verifyRecoveryEmail({ verificationCode });
      toast.success('Recovery email verified successfully');
      setIsVerified(true);
    } catch (error: unknown) {
      toast.error('Failed to verify recovery email', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleVerify();
  };

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
          onSubmit={handleSubmit}
          className="w-full max-w-xs">
          <p className="mb-4 text-sm text-gray-600">
            Please enter the verification code sent to your recovery email.
          </p>
          <Input
            label="Verification Code"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter verification code"
            className="mb-4 w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleVerify();
              }
            }}
          />
          <Button
            type="submit"
            disabled={isVerifying}
            className="w-full">
            {isVerifying ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>
      )}
    </div>
  );
}
