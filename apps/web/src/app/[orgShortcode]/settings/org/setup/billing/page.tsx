'use client';

import { Skeleton } from '@/src/components/shadcn-ui/skeleton';
import { PageTitle } from '../../../_components/page-title';
import { Button } from '@/src/components/shadcn-ui/button';
import { PricingTable } from './_components/plans-table';
import { useOrgShortcode } from '@/src/hooks/use-params';
import { useEffect, useState } from 'react';
import CalEmbed from '@calcom/embed-react';
import { platform } from '@/src/lib/trpc';

export default function Page() {
  const orgShortcode = useOrgShortcode();
  const { data, isLoading } =
    platform.org.setup.billing.getOrgBillingOverview.useQuery({
      orgShortcode
    });

  const { mutateAsync: createPortalLink, isPending: isLoadingPortalLink } =
    platform.org.setup.billing.getOrgStripePortalLink.useMutation();

  const [showPlan, setShowPlans] = useState(false);

  useEffect(() => {
    if (data?.currentPlan === 'pro') {
      setShowPlans(false);
    }
  }, [data?.currentPlan]);

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageTitle
        title="Billing"
        description="Manage your organization's billing"
      />
      {isLoading && (
        <Skeleton className="h-20 w-56 items-center justify-center" />
      )}
      {data && (
        <>
          <div className="my-2 flex gap-8">
            <div className="flex flex-col">
              <div className="">Current Plan</div>
              <div className="font-display text-xl">
                {data.currentPlan === 'pro' ? 'Pro' : 'Free'}
              </div>
            </div>
            {data.totalUsers && (
              <div className="flex flex-col">
                <div className="">Users</div>
                <div className="font-display text-right text-xl">
                  {data.totalUsers}
                </div>
              </div>
            )}
            {data.currentPlan === 'pro' && (
              <div className="flex flex-col">
                <div className="text-base-11">Billing Period</div>
                <div className="font-display text-xl">
                  {data.currentPeriod === 'monthly' ? 'Monthly' : 'Yearly'}
                </div>
              </div>
            )}
          </div>
          {data.currentPlan !== 'pro' && !showPlan && (
            <Button
              onClick={() => setShowPlans(true)}
              className="w-fit">
              Upgrade
            </Button>
          )}
          {showPlan && <PricingTable />}
          {data.currentPlan === 'pro' && (
            <div className="flex flex-col gap-2">
              <Button
                className="w-fit"
                loading={isLoadingPortalLink}
                onClick={async () => {
                  const { portalLink } = await createPortalLink({
                    orgShortcode
                  });
                  window.open(portalLink, '_blank');
                }}>
                Manage Your Subscription
              </Button>

              <div className="flex flex-col gap-2 py-2">
                {data.dates?.start_date ? (
                  <div>
                    <span>Subscription started on </span>
                    <span className="font-semibold">
                      {new Date(
                        data.dates.start_date * 1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                ) : null}

                <div>
                  {data.dates?.cancel_at_period_end ? (
                    <span>Pending cancelation on </span>
                  ) : (
                    <span>Subscription renews on </span>
                  )}
                  <span className="font-semibold">
                    {data.dates?.current_period_end
                      ? new Date(
                          data.dates?.current_period_end * 1000
                        ).toLocaleDateString()
                      : 'End of Current billing cycle'}
                  </span>
                </div>
              </div>
            </div>
          )}
          {data.currentPlan === 'pro' && (
            <div className="my-4 flex w-full flex-1 flex-col gap-2">
              <div className="font-display text-xl">
                Jump on a Free Onboarding Call
              </div>
              <CalEmbed calLink="mc/unboarding" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
