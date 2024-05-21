'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useState } from 'react';
import { PlansTable } from './_components/plans-table';
import CalEmbed from '@calcom/embed-react';
import Link from 'next/link';
import { cn } from '@/src/lib/utils';

export default function Page() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const { data, isLoading } =
    api.org.setup.billing.getOrgBillingOverview.useQuery({
      orgShortCode
    });

  const { data: portalLink } =
    api.org.setup.billing.getOrgStripePortalLink.useQuery(
      { orgShortCode },
      {
        enabled: data?.currentPlan === 'pro'
      }
    );

  const [showPlan, setShowPlans] = useState(false);

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <h1 className="font-display text-3xl leading-5">Billing</h1>
      <div>Manage your organization&apos;s subscription</div>
      {isLoading && <div>Loading...</div>}
      {data && (
        <>
          <div className="my-2 flex gap-8">
            <div className="flex flex-col">
              <div className="text-muted-foreground">Current Plan</div>
              <div className="font-display text-2xl">
                {data.currentPlan === 'pro' ? 'Pro' : 'Free'}
              </div>
            </div>
            {data.totalUsers && (
              <div className="flex flex-col">
                <div className="text-muted-foreground">Users</div>
                <div className="font-display text-right text-2xl">
                  {data.totalUsers}
                </div>
              </div>
            )}
            {data.currentPlan === 'pro' && (
              <div className="flex flex-col">
                <div className="text-muted-foreground">Billing Period</div>
                <div className="font-display text-2xl">
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
          {showPlan && <PlansTable />}
          {data.currentPlan === 'pro' && (
            <Button
              className={cn(
                'w-fit',
                !portalLink && 'pointer-events-none opacity-75'
              )}
              asChild>
              <Link
                href={portalLink?.portalLink ?? '#'}
                target="_blank">
                Manage Your Subscription
              </Link>
            </Button>
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
