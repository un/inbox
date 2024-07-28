'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { isAuthenticated, platform } from '@/src/lib/trpc';
import { Input } from '@/src/components/shadcn-ui/input';
import { SpinnerGap } from '@phosphor-icons/react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [verificationCode, setVerificationCode] = useState(
    searchParams.get('code') ?? ''
  );

  const { data: isLoggedIn, isLoading: isLoadingLoggedIn } = useQuery({
    queryFn: () => isAuthenticated(),
    queryKey: ['auth', 'recovery']
  });

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
    <div className="bg-base-2 flex h-full w-full flex-col items-center justify-center">
      <div className="mx-auto flex w-full max-w-[340px] flex-col gap-5 p-2">
        <div className="flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="UnInbox Logo"
            height={40}
            width={40}
            className="rounded-xl"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-base-12 flex items-center gap-2 text-2xl font-medium">
            <span className="whitespace-nowrap">Verify Recovery Email</span>
          </div>
          {isLoadingLoggedIn ? (
            <div className="flex h-32 items-center justify-center gap-2 rounded-lg border">
              <SpinnerGap
                className="h-4 w-4 animate-spin"
                size={12}
              />
              <span className="text-base-11 text-sm">Loading...</span>
            </div>
          ) : isLoggedIn ? (
            isVerified ? (
              <>
                <p className="mb-4 text-sm text-gray-600">
                  Your email has been successfully verified.
                </p>
                <Link
                  href="/"
                  passHref>
                  <Button className="w-full max-w-xs">
                    Return to Homepage
                  </Button>
                </Link>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  verifyRecoveryEmail({ verificationCode }).catch(() => null);
                }}
                className="w-full max-w-xs">
                <p className="mb-4 text-sm text-gray-600">
                  Please enter the verification code sent to your recovery
                  email.
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
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-4">
              <span className="text-base-11 text-sm font-semibold">
                You are not logged in. Please login to verify your email.
              </span>
              <Button
                asChild
                className="w-full">
                <Link
                  href={`/?redirect_to=${encodeURIComponent(`/recovery/verify-email?code=${verificationCode}`)}`}>
                  Login
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
