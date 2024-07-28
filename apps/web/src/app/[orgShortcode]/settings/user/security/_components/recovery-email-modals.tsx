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
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { Envelope } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { toast } from 'sonner';
import { z } from 'zod';

type RecoveryEmailModalProps = {
  open: 'enable' | 'change' | null;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
};

const recoveryEmailFormSchema = z.object({
  recoveryEmail: z.string().email('Enter a valid email')
});

export function RecoveryEmailModal({
  open,
  setOpen,
  onSuccess
}: RecoveryEmailModalProps) {
  const form = useForm<z.infer<typeof recoveryEmailFormSchema>>({
    resolver: zodResolver(recoveryEmailFormSchema),
    defaultValues: {
      recoveryEmail: ''
    }
  });

  const {
    mutateAsync: setupOrUpdateRecoveryEmail,
    isPending: recoveryEmailPending
  } = platform.account.security.setupOrUpdateRecoveryEmail.useMutation({
    onError: (err) => {
      toast.error('Something went wrong while setting up your recovery email', {
        description: err.message,
        className: 'z-[1000]'
      });
    },
    onSuccess: ({ success }) => {
      if (success) {
        onSuccess();
        setOpen(false);
        toast.info(
          'An email has been sent to your recovery email. Please check your inbox for the verification email'
        );
      }
    }
  });

  return (
    <Dialog
      open={Boolean(open)}
      onOpenChange={() => {
        if (recoveryEmailPending) return;
        setOpen(!open);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {open === 'enable' ? 'Setup' : 'Change'} Recovery Email
          </DialogTitle>
          <DialogDescription>
            {open === 'enable'
              ? 'Enabling recovery email will allow you to recover your account via backup email. This email would only be used to recover your account or send critical updates about your account, and would not be shared with anyone'
              : 'Changing recovery email render your current recovery email useless. Your recovery email would not be changed until you verify the new email'}
          </DialogDescription>
          <div>
            <Form {...form}>
              <FormField
                control={form.control}
                name="recoveryEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        label="Recovery Email"
                        inputSize="lg"
                        leadingSlot={Envelope}
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
              loading={recoveryEmailPending}
              className="flex-1"
              onClick={(e) =>
                form.handleSubmit((values) =>
                  setupOrUpdateRecoveryEmail(values)
                )(e)
              }>
              {open === 'enable' ? 'Set' : 'Change'} Recovery Email
            </Button>
          </DialogFooter>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

type DisableRecoveryEmailModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
};

export function DisableRecoveryEmailModal({
  open,
  setOpen,
  onSuccess
}: DisableRecoveryEmailModalProps) {
  const {
    mutateAsync: disableRecoveryEmail,
    isPending: disableRecoveryEmailPending
  } = platform.account.security.disableRecoveryEmail.useMutation({
    onError: (err) => {
      toast.error('Something went wrong while disabling your recovery email', {
        description: err.message,
        className: 'z-[1000]'
      });
    },
    onSuccess: ({ success }) => {
      if (success) {
        onSuccess();
        setOpen(false);
        toast.info('Recovery email has been disabled');
      }
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (disableRecoveryEmailPending) return;
        setOpen(!open);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable Recovery Email</DialogTitle>
          <DialogDescription>
            Disabling recovery email will remove your recovery email from your
            account. You will not be able to recover your account if you lose
            your recovery email.
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
            loading={disableRecoveryEmailPending}
            onClick={() => disableRecoveryEmail()}>
            Disable Recovery Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
