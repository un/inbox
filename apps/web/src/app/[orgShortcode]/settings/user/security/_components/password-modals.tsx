import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import { PasswordInput } from '@/src/components/password-input';
import { Button } from '@/src/components/shadcn-ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDebounce } from '@uidotdev/usehooks';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

type DisablePasswordModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
};

export function DisablePasswordModal({
  open,
  setOpen,
  onSuccess
}: DisablePasswordModalProps) {
  const { mutateAsync: disablePassword, isPending: disablingPassword } =
    platform.account.security.disablePassword.useMutation({
      onSuccess: ({ success }) => {
        if (success) {
          onSuccess();
          setOpen(false);
        }
      },
      onError: (err) => {
        toast.error('Something went wrong', {
          description: err.message,
          className: 'z-[1000]'
        });
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        setOpen(!open);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable Password</DialogTitle>
          <DialogDescription>
            This will disable your Password as well as your 2FA login. That
            means you would not be able to login with your password anymore.
            Make sure you have an available Passkey right now before disabling
            your password.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="flex-1">
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="flex-1"
            loading={disablingPassword}
            onClick={() => disablePassword()}>
            Disable Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ChangeOrEnablePasswordModalProps = {
  open: 'enable' | 'change' | null;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
};

const passwordFormSchema = z.object({
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string().min(8),
  validated: z.boolean()
});

export function EnableOrChangePasswordModal({
  open,
  setOpen,
  onSuccess
}: ChangeOrEnablePasswordModalProps) {
  const { mutateAsync: changeOrEnablePassword, isPending: changingPassword } =
    platform.account.security.changeOrEnablePassword.useMutation({
      onSuccess: ({ success }) => {
        if (success) {
          onSuccess();
          setOpen(false);
          toast.success('Your Password has been changed');
        }
      },
      onError: (err) => {
        toast.error('Something went wrong', {
          description: err.message,
          className: 'z-[1000]'
        });
      }
    });

  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      validated: false
    }
  });

  const password = form.watch('password');
  const confirmPassword = form.watch('confirmPassword');
  const validated = form.watch('validated');

  const debouncedPassword = useDebounce(password, 1000);

  // zod validation when length < 8
  useEffect(() => {
    if (debouncedPassword.length === 0) return form.clearErrors('password');
    if (debouncedPassword.length < 8) {
      void form.trigger('password');
    }
  }, [debouncedPassword, form]);

  const { data: passwordStrength, isLoading: strengthLoading } =
    platform.account.security.checkPasswordStrength.useQuery(
      {
        password: debouncedPassword
      },
      {
        enabled: debouncedPassword.length >= 8
      }
    );

  // run validation with remote data and password match
  useEffect(() => {
    if (!(debouncedPassword.length >= 8)) return;
    const passwordValid =
      (debouncedPassword.length >= 8 && passwordStrength?.allowed) ?? false;

    if (
      passwordValid &&
      password !== confirmPassword &&
      confirmPassword.length >= 8
    ) {
      form.setError('confirmPassword', { message: "Passwords don't match" });
    }

    if (passwordValid && password === confirmPassword) {
      form.clearErrors('password');
      form.clearErrors('confirmPassword');
      form.setValue('validated', true);
    }
  }, [
    form,
    debouncedPassword,
    passwordStrength?.allowed,
    password,
    confirmPassword
  ]);

  // Strength Loading state
  useEffect(() => {
    if (strengthLoading) {
      form.setError('password', { message: 'Calculating Strength...' });
    }
  }, [form, strengthLoading]);

  // Strength error
  useEffect(() => {
    if (!(debouncedPassword.length >= 8) || !passwordStrength) return;
    if (passwordStrength.allowed === false) {
      form.setError('password', {
        message: `Your Password is ${['Super Weak', 'Weak', 'Not Great'][passwordStrength?.score ?? 0]}`
      });
    } else {
      form.clearErrors('password');
    }
  }, [form, debouncedPassword, passwordStrength]);

  return (
    <Dialog
      open={Boolean(open)}
      onOpenChange={() => {
        if (changingPassword) return;
        setOpen(!open);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {open === 'enable' ? 'Enable Password' : 'Change Password'}
          </DialogTitle>
          <DialogDescription>
            {open === 'enable'
              ? "Enabling your Password will allow you to login with your password. It's also recommended to enable 2FA with your new password for added security"
              : 'Enter your new password'}
          </DialogDescription>
          <div className="flex flex-col gap-2 p-4">
            <Form {...form}>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <PasswordInput
                        inputSize="lg"
                        label="Password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
                        inputSize="lg"
                        label="Confirm Password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
          </div>
          <DialogFooter className="flex gap-2">
            <DialogClose asChild>
              <Button
                variant="secondary"
                className="flex-1">
                Cancel
              </Button>
            </DialogClose>
            <Button
              className="flex-1"
              loading={changingPassword}
              disabled={!validated}
              onClick={async (e) => {
                e.preventDefault();
                if (!validated)
                  return form.setError('password', {
                    message:
                      'Password strength was not validated, please try again'
                  });
                await form.handleSubmit((data) =>
                  changeOrEnablePassword({
                    newPassword: data.password
                  })
                )(e);
              }}>
              {open === 'enable' ? 'Enable Password' : 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
