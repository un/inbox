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
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const { mutateAsync: sendRecoveryEmail } =
    platform.account.security.sendRecoveryEmail.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await sendRecoveryEmail({ username, email });
      toast.success(
        'Recovery email sent. Please check your inbox for the verification code.'
      );
      router.push('/recovery/reset-password/verify');
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-4 text-2xl font-bold">Request Password Reset</h1>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <Input
            label="Username"
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1"
            required
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700">
            Recovery Email
          </label>
          <Input
            label="Recovery Email"
            id="email"
            type="email"
            placeholder="Enter your recovery email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send Recovery Email'}
        </Button>
      </form>
    </div>
  );
}
