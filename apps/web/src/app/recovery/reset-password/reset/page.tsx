'use client';

import {
  Form,
  FormControl,
  FormField,
  FormItem
} from '@/src/components/shadcn-ui/form';
import { StrengthMeter } from '@/src/components/shared/strength-meter';
import { PasswordInput } from '@/src/components/password-input';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/src/components/shadcn-ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDebounce } from '@uidotdev/usehooks';
import { Lock } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { toast } from 'sonner';
import { z } from 'zod';

const passwordFormSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  validated: z.boolean()
});

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get('token');

  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      validated: false
    }
  });

  const { mutateAsync: resetPassword } =
    platform.auth.recovery.resetPassword.useMutation();

  const password = form.watch('password');
  const confirmPassword = form.watch('confirmPassword');
  const debouncedPassword = useDebounce(password, 1000);
  const passwordMatch =
    password.length >= 8 && confirmPassword.length >= 8
      ? password === confirmPassword
      : null;

  const { data, isLoading: strengthCheckLoading } =
    platform.auth.signup.checkPasswordStrength.useQuery(
      { password: debouncedPassword },
      { enabled: debouncedPassword.length > 0 }
    );

  useEffect(() => {
    const handleValidation = async () => {
      if (debouncedPassword.length === 0) return;
      await form.trigger('password');
    };
    void handleValidation();
  }, [debouncedPassword, form]);

  useEffect(() => {
    form.setValue(
      'validated',
      (password.length >= 8 &&
        confirmPassword.length >= 8 &&
        data?.allowed &&
        password === confirmPassword) ??
        false
    );
  }, [form, data?.allowed, password, confirmPassword]);

  const handleSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    if (!resetToken) {
      toast.error('Invalid reset token');
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword({ token: resetToken, newPassword: values.password });
      toast.success(
        'Password reset successfully. You can now log in with your new password.'
      );
      router.push('/login');
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'NOT_FOUND') {
          toast.error('Invalid or expired reset token');
        } else if (error.name === 'BAD_REQUEST') {
          toast.error('Invalid or expired reset token');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasPasswordValidationError = form.formState.errors.password;
  const hasPasswordMatchError = passwordMatch === false;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-4 text-2xl font-bold">Reset Your Password</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="w-full max-w-md space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <PasswordInput
                    label="New Password"
                    inputSize="lg"
                    className="focus-visible:border-accent-9 focus-within:z-1 rounded-b-none shadow-none focus-visible:ring-0"
                    leadingSlot={Lock}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <PasswordInput
                    label="Confirm New Password"
                    inputSize="lg"
                    className="focus-visible:border-accent-9 mt-[-1px] rounded-t-none border-t-transparent shadow-none focus-visible:ring-0"
                    leadingSlot={Lock}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {hasPasswordValidationError && (
            <p className="text-red-9 w-full text-left text-xs">
              {form.formState.errors.password?.message}
            </p>
          )}
          {hasPasswordMatchError && (
            <p className="text-red-9 w-full text-left text-xs">
              Passwords don&apos;t match
            </p>
          )}
          <StrengthMeter
            strength={
              debouncedPassword.length >= 8
                ? (data?.score ?? -1) + 1
                : undefined
            }
            message={
              strengthCheckLoading ? (
                'Calculating Strength...'
              ) : data?.score ? (
                <span className="text-green-9">
                  {
                    ['Super Weak', 'Weak', 'Not Great', 'Great', 'Godlike'][
                      data?.score ?? 0
                    ]
                  }
                </span>
              ) : null
            }
            error={false}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !form.watch('validated')}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
