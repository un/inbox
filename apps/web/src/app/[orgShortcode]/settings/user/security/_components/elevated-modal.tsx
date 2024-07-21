import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/src/components/shadcn-ui/input-otp';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { PasswordInput } from '@/src/components/password-input';
import { startAuthentication } from '@simplewebauthn/browser';
import { platform, type RouterOutputs } from '@/src/lib/trpc';
import { Button } from '@/src/components/shadcn-ui/button';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { zodResolver } from '@hookform/resolvers/zod';
import { Fingerprint } from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type OverviewData = RouterOutputs['account']['security']['getOverview'];

type ElevatedModalProps = {
  overviewData: OverviewData;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
};

const sudoModePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  twoFactorCode: z.string().min(6, '2FA Code must be 6 digits').nullable()
});

export function ElevatedModal({
  open,
  setOpen,
  overviewData,
  onSuccess
}: ElevatedModalProps) {
  const { mutateAsync: generatePasskeyChallenge } =
    platform.account.security.generatePasskeyVerificationChallenge.useMutation();
  const { mutateAsync: grantElevation, isPending: grantElevationPending } =
    platform.account.security.grantElevation.useMutation();

  const {
    mutateAsync: passkeyVerification,
    isPending: passkeyVerificationPending
  } = useMutation({
    mutationFn: async () => {
      const { options } = await generatePasskeyChallenge();
      const response = await startAuthentication(options).catch(
        (error: Error) => {
          if (error.name === 'NotAllowedError') {
            toast.info('Passkey Verification was canceled', {
              className: 'z-[1000]'
            });
          }
        }
      );
      if (!response) return { success: false };
      return await grantElevation({
        mode: 'PASSKEY',
        passkeyResponse: response
      });
    },
    onSuccess: ({ success }) => {
      if (success) {
        onSuccess();
        setOpen(false);
      }
    },
    onError: (error) => {
      toast.error('Passkey Verification failed', {
        description: error.message,
        className: 'z-[1000]'
      });
    }
  });

  const form = useForm<z.infer<typeof sudoModePasswordSchema>>({
    resolver: zodResolver(sudoModePasswordSchema),
    defaultValues: {
      password: '',
      twoFactorCode: ''
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (passkeyVerificationPending || grantElevationPending) return;
        setOpen(!open);
      }}>
      <DialogContent className="w-fit">
        <DialogHeader>
          <DialogTitle>Elevated Security Mode</DialogTitle>
          <DialogDescription>
            Elevated Security Mode grants you temporary elevation to perform
            sensitive actions like changing your password or adding new
            passkeys.
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto flex w-fit flex-col gap-4">
          {overviewData.passkeys.length > 0 && (
            <Button
              className="w-full gap-2"
              onClick={() => passkeyVerification()}>
              <Fingerprint size={20} />
              <span>Use Your Passkey</span>
            </Button>
          )}
          {overviewData.passkeys.length > 0 && overviewData.passwordSet ? (
            <div className="flex w-full items-center gap-2 p-2">
              <Separator className="flex-1" />
              <Badge className="uppercase">or</Badge>
              <Separator className="flex-1" />
            </div>
          ) : null}
          {overviewData.passwordSet ? (
            <Form {...form}>
              <div className="mx-auto flex w-fit flex-col items-center gap-4 p-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <PasswordInput
                          className="w-fit"
                          inputSize="lg"
                          label="Password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {overviewData.twoFactorEnabled && (
                  <FormField
                    control={form.control}
                    name="twoFactorCode"
                    render={({ field }) => (
                      <FormItem className="mx-auto w-fit">
                        <FormLabel>2FA Code</FormLabel>
                        <FormControl>
                          <InputOTP
                            maxLength={6}
                            value={field.value ?? ''}
                            onChange={(e) => form.setValue('twoFactorCode', e)}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <Button
                  className="w-full"
                  loading={grantElevationPending}
                  onClick={async (e) => {
                    if (!overviewData.twoFactorEnabled) {
                      form.setValue('twoFactorCode', null);
                    }
                    e.preventDefault();
                    await form.handleSubmit((values) =>
                      grantElevation({
                        mode: 'PASSWORD',
                        ...values
                      })
                        .then(({ success }) => {
                          if (success) {
                            setOpen(false);
                            onSuccess?.();
                          }
                        })
                        .catch((err) => {
                          if (err instanceof Error) {
                            form.setError('password', { message: err.message });
                            form.setValue('twoFactorCode', '');
                          }
                        })
                    )(e);
                  }}>
                  Use Password
                </Button>
              </div>
            </Form>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
