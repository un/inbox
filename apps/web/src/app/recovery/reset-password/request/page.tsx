'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { useRouter } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import { toast } from 'sonner';

export default function RequestResetPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const router = useRouter();

  const { mutate: sendRecoveryEmail, isPending } =
    platform.account.security.sendRecoveryEmail.useMutation({
      onSuccess: () => {
        toast.success(
          'Recovery email sent. Please check your inbox for the verification code.'
        );
        router.push('/recovery/reset-password/verify');
      },
      onError: () => {
        toast.error('An error occurred. Please try again.');
      }
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendRecoveryEmail({ username, email });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-4 text-2xl font-bold">Request Password Reset</h1>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4">
        <div>
          <Input
            label="Username"
            id="username"
            type="text"
            value={username}
            inputSize="lg"
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1"
            required
          />
        </div>
        <div>
          <Input
            label="Recovery Email"
            id="email"
            type="email"
            inputSize="lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={isPending}>
          {isPending ? 'Sending...' : 'Send Recovery Email'}
        </Button>
      </form>
    </div>
  );
}
