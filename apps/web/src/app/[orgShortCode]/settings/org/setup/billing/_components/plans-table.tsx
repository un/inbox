'use client';
import { Button } from '@/src/components/shadcn-ui/button';
import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertDialog as Dialog } from '@radix-ui/themes';
import useAwaitableModal, {
  type ModalComponent
} from '@/src/hooks/use-awaitable-modal';

export function PlansTable() {
  const [period /*setPeriod*/] = useState<'monthly' | 'yearly'>('monthly');

  const [StripeWatcherRoot, openPaymentModal] = useAwaitableModal(
    StripeWatcher,
    {
      period
    }
  );

  return (
    <div className="flex w-full max-w-2xl gap-4">
      <div className="flex flex-1 flex-col gap-2 rounded border p-2">
        <div className="font-display text-2xl">Free</div>
        <div className="h-[200px]">Free Plan Perks Here</div>
        <Button disabled>Your Current Plan</Button>
      </div>
      <div className="flex flex-1 flex-col gap-2 rounded border p-2">
        <div className="font-display text-2xl">Pro</div>
        <div className="h-[200px]">Pro Plan Perks Here</div>
        {/* Monthly only for now, setup the period selector */}
        <Button onClick={() => openPaymentModal().catch(() => null)}>
          Upgrade
        </Button>
      </div>
      <StripeWatcherRoot />
    </div>
  );
}

function StripeWatcher({
  open,
  period,
  onClose,
  onResolve
}: ModalComponent<{ period: 'monthly' | 'yearly' }>) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const {
    data: paymentLinkInfo,
    error: linkError,
    isLoading: paymentLinkLoading
  } = api.org.setup.billing.getOrgSubscriptionPaymentLink.useQuery(
    {
      orgShortCode,
      period,
      plan: 'pro'
    },
    { enabled: open }
  );
  const paymentLinkCache =
    api.useUtils().org.setup.billing.getOrgSubscriptionPaymentLink;

  const overviewApi = api.useUtils().org.setup.billing.getOrgBillingOverview;
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const checkPayment = useCallback(async () => {
    const overview = await overviewApi.fetch({ orgShortCode });
    if (overview.currentPlan === 'pro') {
      await overviewApi.invalidate({ orgShortCode });
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      onResolve(null);
      return;
    } else {
      timeout.current = setTimeout(() => {
        void checkPayment();
      }, 7500);
    }
  }, [onResolve, orgShortCode, overviewApi]);

  useEffect(() => {
    if (!open || !paymentLinkInfo) return;
    window.open(paymentLinkInfo.subLink, '_blank');
    timeout.current = setTimeout(() => {
      void checkPayment();
    }, 10000);
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      void paymentLinkCache.reset();
    };
  }, [open, paymentLinkInfo, paymentLinkCache, checkPayment]);

  return (
    <Dialog.Root open={open}>
      <Dialog.Content>
        <Dialog.Title className="p-2">Upgrade to Pro</Dialog.Title>
        <Dialog.Description className="space-y-2 p-2">
          {paymentLinkLoading
            ? 'Generating Payment Link'
            : 'Waiting For you to complete your Payment (This may take a few seconds)'}
        </Dialog.Description>
        <div className="flex flex-col gap-2 p-2">
          We are waiting for you to complete your payment, If you have already
          done the payment, please wait for a few seconds for the payment to
          reflect. If this modal is not detecting your payment, please close
          this modal and try refreshing. If the issue persists, please contact
          support.
        </div>
        <div className="text-red-10 space-y-2 font-medium">
          {linkError?.message}
        </div>
        <div className="flex flex-col gap-2 py-2">
          <Button onClick={() => onClose()}>Close</Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
