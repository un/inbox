'use client';

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/src/components/shadcn-ui/input-otp';
import {
  DisableRecoveryEmailModal,
  RecoveryEmailModal
} from './recovery-email-modals';
import { Button } from '@/src/components/shadcn-ui/button';
import { CheckCircle, Clock } from '@phosphor-icons/react';
import { Input } from '@/src/components/shadcn-ui/input';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { platform } from '@/src/lib/trpc';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

interface RecoveryEmailSectionProps {
  ensureElevated: (fn: () => Promise<void> | void) => void;
}

function VerifiedEmailStatus({ verifiedAt }: { verifiedAt: Date }) {
  return (
    <div className="text-green-11 flex items-center gap-1">
      <CheckCircle
        size={16}
        weight="fill"
      />
      <span className="text-sm">
        Your recovery email is set and verified at{' '}
        {format(verifiedAt, 'HH:mm, do MMM yyyy')}
      </span>
    </div>
  );
}

function UnverifiedEmailStatus() {
  return (
    <>
      <div className="text-yellow-11 flex items-center gap-1">
        <Clock
          size={16}
          weight="fill"
        />
        <span className="text-sm">
          Your recovery email is set but not verified yet
        </span>
      </div>
      <span className="text-base-10 text-sm">
        Please verify your recovery email or change it if it's incorrect.
      </span>
    </>
  );
}

function VerificationForm({ onVerify }: { onVerify: (code: string) => void }) {
  const [verificationCode, setVerificationCode] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onVerify(verificationCode);
      }}
      className="flex items-end gap-2">
      <div className="space-y-2">
        <label
          htmlFor="verificationCode"
          className="block text-sm font-medium text-gray-700">
          Enter your 6-digit verification code
        </label>
        <InputOTP
          value={verificationCode}
          onChange={setVerificationCode}
          pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
          maxLength={6}>
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
      <Button type="submit">Verify</Button>
    </form>
  );
}

function RecoveryEmailActions({
  isSet,
  onEnable,
  onChange,
  onDisable
}: {
  isSet: boolean;
  onEnable: () => void;
  onChange: () => void;
  onDisable: () => void;
}) {
  return (
    <div className="flex gap-2">
      {isSet ? (
        <>
          <Button onClick={onChange}>Reset</Button>
          <Button
            variant="destructive"
            onClick={onDisable}>
            Disable
          </Button>
        </>
      ) : (
        <Button onClick={onEnable}>Setup Recovery Email</Button>
      )}
    </div>
  );
}

export default function RecoveryEmailSection({
  ensureElevated
}: RecoveryEmailSectionProps) {
  const [recoveryEmailModalOpen, setRecoveryEmailModalOpen] = useState<
    'enable' | 'change' | null
  >(null);
  const [disableRecoveryEmailModalOpen, setDisableRecoveryEmailModalOpen] =
    useState(false);

  const platformUtils = platform.useUtils();
  const { data: overviewData, refetch: refetchOverviewData } =
    platform.account.security.getOverview.useQuery(void 0, {
      refetchOnWindowFocus: true
    });

  const { mutateAsync: verifyRecoveryEmail } =
    platform.account.security.verifyRecoveryEmail.useMutation({
      onSuccess: () => {
        toast.success('Recovery email verified successfully');
        refetchOverviewData();
      },
      onError: (error: unknown) => {
        toast.error('Failed to verify recovery email', {
          description:
            error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    });

  if (!overviewData) return null;

  return (
    <div className="flex flex-col gap-2">
      {overviewData.recoveryEmailSet &&
        (overviewData.recoveryEmailVerifiedAt ? (
          <VerifiedEmailStatus
            verifiedAt={overviewData.recoveryEmailVerifiedAt}
          />
        ) : (
          <>
            <UnverifiedEmailStatus />
            <VerificationForm
              onVerify={(code) =>
                verifyRecoveryEmail({ verificationCode: code }).catch(
                  () => null
                )
              }
            />
          </>
        ))}
      <RecoveryEmailActions
        isSet={overviewData.recoveryEmailSet}
        onEnable={() =>
          ensureElevated(() => setRecoveryEmailModalOpen('enable'))
        }
        onChange={() =>
          ensureElevated(() => setRecoveryEmailModalOpen('change'))
        }
        onDisable={() =>
          ensureElevated(() => setDisableRecoveryEmailModalOpen(true))
        }
      />

      {recoveryEmailModalOpen && (
        <RecoveryEmailModal
          open={recoveryEmailModalOpen}
          setOpen={(open) => setRecoveryEmailModalOpen(open ? 'change' : null)}
          onSuccess={async () => {
            platformUtils.account.security.getOverview.setData(void 0, (up) => {
              if (!up) return;
              return {
                ...up,
                recoveryEmailSet: true,
                recoveryEmailVerifiedAt: null
              };
            });
            await refetchOverviewData();
          }}
        />
      )}

      {disableRecoveryEmailModalOpen && (
        <DisableRecoveryEmailModal
          open={disableRecoveryEmailModalOpen}
          setOpen={setDisableRecoveryEmailModalOpen}
          onSuccess={async () => {
            platformUtils.account.security.getOverview.setData(void 0, (up) => {
              if (!up) return;
              return {
                ...up,
                recoveryEmailSet: false,
                recoveryEmailVerifiedAt: null
              };
            });
            await refetchOverviewData();
          }}
        />
      )}
    </div>
  );
}
