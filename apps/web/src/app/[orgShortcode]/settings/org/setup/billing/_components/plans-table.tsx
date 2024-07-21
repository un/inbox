'use client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from '@/src/components/shadcn-ui/alert-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/src/components/shadcn-ui/card';
import useAwaitableModal, {
  type ModalComponent
} from '@/src/hooks/use-awaitable-modal';
import { Tabs, TabsList, TabsTrigger } from '@/src/components/shadcn-ui/tabs';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/src/components/shadcn-ui/button';
import { Check } from '@phosphor-icons/react';
import { platform } from '@/src/lib/trpc';
import { cn } from '@/src/lib/utils';

type PricingSwitchProps = {
  onSwitch: (value: string) => void;
};

type PricingCardProps = {
  isYearly?: boolean;
  title: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  price?: string;
  description: string;
  features: string[];
  actionLabel: string;
  popular?: boolean;
  exclusive?: boolean;
  handler: () => void;
};

const PricingHeader = ({
  title,
  subtitle
}: {
  title: string;
  subtitle: string;
}) => (
  <section className="text-center">
    <h2 className="font-display text-5xl">{title}</h2>
    <p className="pt-1 text-xl">{subtitle}</p>
    <br />
  </section>
);

const PricingSwitch = ({ onSwitch }: PricingSwitchProps) => (
  <Tabs
    defaultValue="0"
    onValueChange={onSwitch}>
    <TabsList className="px-2 py-6">
      <TabsTrigger
        value="0"
        className="text-base">
        Monthly
      </TabsTrigger>
      <TabsTrigger
        value="1"
        className="text-base">
        Yearly
      </TabsTrigger>
    </TabsList>
  </Tabs>
);

const PricingCard = ({
  isYearly,
  title,
  monthlyPrice,
  yearlyPrice,
  price,
  description,
  features,
  actionLabel,
  popular,
  exclusive,
  handler
}: PricingCardProps) => (
  <Card
    className={cn(
      `flex w-72 flex-col justify-between py-1 ${popular ? 'border-accent-9' : 'border-base-6'} mx-auto sm:mx-0`,
      {
        'animate-background-shine bg-base-1 bg-[length:200%_100%] transition-colors dark:bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)]':
          exclusive
      }
    )}>
    <div>
      <CardHeader className="pb-8 pt-4">
        {isYearly && yearlyPrice && monthlyPrice ? (
          <div className="flex justify-between">
            <CardTitle className="text-base-11 text-lg">{title}</CardTitle>
            <div
              className={cn(
                'bg-base-2 text-base-12 h-fit rounded-xl px-2.5 py-1 text-sm',
                {
                  'from-amber-9 to-pink-9 bg-gradient-to-r': popular
                }
              )}>
              Save ${monthlyPrice * 12 - yearlyPrice}
            </div>
          </div>
        ) : (
          <CardTitle className="text-base-11 text-lg">{title}</CardTitle>
        )}
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-row gap-0.5">
            <h3 className="text-3xl font-bold">
              {yearlyPrice && isYearly
                ? '$' + yearlyPrice
                : monthlyPrice
                  ? '$' + monthlyPrice
                  : price}
            </h3>
            <span className="mb-1 flex flex-col justify-end text-sm">
              {yearlyPrice && isYearly
                ? '/year per user'
                : monthlyPrice
                  ? '/month per user'
                  : null}
            </span>
          </div>
        </div>

        <CardDescription className="h-12 pt-1.5">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {features.map((feature: string) => (
          <CheckItem
            key={feature}
            text={feature}
          />
        ))}
      </CardContent>
    </div>
    <CardFooter className="mt-2">
      <Button onClick={() => handler()}>{actionLabel}</Button>
    </CardFooter>
  </Card>
);

const CheckItem = ({ text }: { text: string }) => (
  <div className="flex gap-2">
    <Check
      size={18}
      className="text-green-6 my-auto"
    />
    <p className="text-base-11 pt-0.5 text-sm">{text}</p>
  </div>
);

export function PricingTable() {
  const [isYearly, setIsYearly] = useState(false);
  const togglePricingPeriod = (value: string) =>
    setIsYearly(parseInt(value) === 1);

  const [StripeWatcherRoot, openPaymentModal] = useAwaitableModal(
    StripeWatcher,
    {
      isYearly,
      plan: 'pro'
    }
  );

  const plans = [
    {
      title: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      price: '$0',
      description: 'For the curious',
      features: [
        '@uninbox.me email address',
        'Personal Spaces',
        '3 Statuses per Space',
        '7 day raw email retention',
        'Community/email support'
      ],
      actionLabel: 'Go Free'
    },
    {
      title: 'basic',
      monthlyPrice: 3,
      yearlyPrice: 30,
      description: 'For the growing',
      features: [
        'Everything in Free',
        '1 Custom Domains',
        'Tags',
        '1 Shared Space',
        '5 Statuses per Space',
        '3 Day activity history',
        '14 Day raw email retention'
      ],
      actionLabel: 'Go Plus'
    },
    {
      title: 'Pro',
      monthlyPrice: 12,
      yearlyPrice: 120,
      description: 'For Teams and Professionals',
      features: [
        'Everything in Plus',
        'Unlimited Custom Domains',
        'Teams',
        'Unlimited Shared & Public Spaces',
        'SMTP & API Access',
        'Convo Assignees',
        '15 Statuses per Space',
        '365 Day activity history',
        '30 Day raw email retention',
        'Priority Chat Support',
        'Video Call Support'
      ],
      actionLabel: 'Go Pro',
      popular: true
    },
    {
      title: 'Enterprise',
      monthlyPrice: 33,
      yearlyPrice: 330,
      description: 'For the leaders',
      features: [
        '30 Users Minimum',
        'Everything in Pro',
        'Dedicated Instance',
        'Custom IP',
        'SAML SSO',
        '10 year convo activity history',
        '10 year raw email retention',
        'Dedicated Onboarding',
        'Org Wide - Video Call Support'
      ],
      actionLabel: 'Go Pro',
      popular: true
    },
    {
      title: 'Self Host',
      price: 'Time and Sanity',
      description: 'For the crazy and the bold',
      features: [
        'All features from the app',
        'Install on your own servers',
        'The ultimate privacy',
        'Free lifetime updates',
        'Sleepless night'
      ],
      actionLabel: 'Go Brave'
    }
  ];
  return (
    <div className="flex flex-col items-center gap-4">
      <PricingHeader
        title="Simple Affordability"
        subtitle="No surprises, no hidden fees. Just simple, transparent pricing."
      />
      <PricingSwitch onSwitch={togglePricingPeriod} />
      <section className="mt-8 flex flex-col justify-center gap-8 sm:flex-row sm:flex-wrap">
        {plans.map((plan) => {
          return (
            <PricingCard
              key={plan.title}
              {...plan}
              isYearly={isYearly}
              handler={() => openPaymentModal().catch(() => null)}
            />
          );
        })}
      </section>
      <StripeWatcherRoot />
    </div>
  );
}

// export function PlansTable() {
//   const [period /*setPeriod*/] = useState<'monthly' | 'yearly'>('monthly');

//   const [StripeWatcherRoot, openPaymentModal] = useAwaitableModal(
//     StripeWatcher,
//     {
//       period
//     }
//   );

//   return (
//     <div className="flex w-full max-w-2xl gap-4">
//       <div className="flex flex-1 flex-col gap-2 rounded border p-2">
//         <div className="font-display text-2xl">Free</div>
//         <div className="h-[200px]">Free Plan Perks Here</div>
//         <Button disabled>Your Current Plan</Button>
//       </div>
//       <div className="flex flex-1 flex-col gap-2 rounded border p-2">
//         <div className="font-display text-2xl">Pro</div>
//         <div className="h-[200px]">Pro Plan Perks Here</div>
//         {/* Monthly only for now, setup the period selector */}
//         <Button onClick={() => openPaymentModal().catch(() => null)}>
//           Upgrade
//         </Button>
//       </div>
//       <StripeWatcherRoot />
//     </div>
//   );
// }

function StripeWatcher({
  open,
  isYearly,
  plan,
  onClose,
  onResolve
}: ModalComponent<{ isYearly: boolean; plan: 'pro' }>) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const {
    data: paymentLinkInfo,
    error: linkError,
    isLoading: paymentLinkLoading
  } = platform.org.setup.billing.getOrgSubscriptionPaymentLink.useQuery(
    {
      orgShortcode,
      period: isYearly ? 'yearly' : 'monthly',
      plan: plan
    },
    { enabled: open }
  );
  const paymentLinkCache =
    platform.useUtils().org.setup.billing.getOrgSubscriptionPaymentLink;

  const overviewApi =
    platform.useUtils().org.setup.billing.getOrgBillingOverview;
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const checkPayment = useCallback(async () => {
    const overview = await overviewApi.fetch({ orgShortcode });
    if (overview.currentPlan === 'pro') {
      await overviewApi.invalidate({ orgShortcode });
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
  }, [onResolve, orgShortcode, overviewApi]);

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
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogTitle>Upgrade to Pro</AlertDialogTitle>
        <AlertDialogDescription className="space-y-2 p-2">
          {paymentLinkLoading
            ? 'Generating Payment Link'
            : 'Waiting For you to complete your Payment (This may take a few seconds)'}
        </AlertDialogDescription>
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
      </AlertDialogContent>
    </AlertDialog>
  );
}
