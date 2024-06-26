'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useState } from 'react';
import { PricingTable } from './_components/plans-table';
import CalEmbed from '@calcom/embed-react';
import Link from 'next/link';
import { cn } from '@/src/lib/utils';
import { PageTitle } from '../../../_components/page-title';
import { Skeleton } from '@radix-ui/themes';

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
                <div className="text-muted-foreground">Billing Period</div>
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
