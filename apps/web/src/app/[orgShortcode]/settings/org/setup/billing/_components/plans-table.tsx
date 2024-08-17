'use client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
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
import { Tabs, TabsList, TabsTrigger } from '@/src/components/shadcn-ui/tabs';
import { Button } from '@/src/components/shadcn-ui/button';
import { Check, SpinnerGap } from '@phosphor-icons/react';
import { useOrgShortcode } from '@/src/hooks/use-params';
import { useEffect, useState } from 'react';
import { platform } from '@/src/lib/trpc';
import { cn } from '@/src/lib/utils';
import { ms } from '@u22n/utils/ms';

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
  const [stripeModalOpen, setStripeModalOpen] = useState(false);

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
        '3 Workflows per Space',
        '7 day raw email retention',
        'Community/email support'
      ],
      actionLabel: 'Go Free',
      handler: () => void 0
    },
    // {
    //   title: 'basic',
    //   monthlyPrice: 3,
    //   yearlyPrice: 30,
    //   description: 'For the growing',
    //   features: [
    //     'Everything in Free',
    //     '1 Custom Domains',
    //     'Tags',
    //     '1 Shared Space',
    //     '5 Workflows per Space',
    //     '3 Day activity history',
    //     '14 Day raw email retention'
    //   ],
    //   actionLabel: 'Go Plus'
    // },
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
        '15 Workflows per Space',
        '365 Day activity history',
        '30 Day raw email retention',
        'Priority Chat Support',
        'Video Call Support'
      ],
      actionLabel: 'Go Pro',
      popular: true,
      handler: () => setStripeModalOpen(true)
    },
    {
      title: 'Enterprise',
      price: 'Contact',
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
        'Org Wide Video Call Support'
      ],
      actionLabel: 'Contact Sales',
      popular: true,
      handler: () => window.open('https://cal.com/mc/un', '_blank')
    }
    // {
    //   title: 'Self Host',
    //   price: 'Time and Sanity',
    //   description: 'For the crazy and the bold',
    //   features: [
    //     'All features from the app',
    //     'Install on your own servers',
    //     'The ultimate privacy',
    //     'Free lifetime updates',
    //     'Sleepless night'
    //   ],
    //   actionLabel: 'Go Brave'
    // }
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
              handler={plan.handler}
            />
          );
        })}
      </section>

      {stripeModalOpen && (
        <StripeModal
          open={stripeModalOpen}
          setOpen={setStripeModalOpen}
          isYearly={isYearly}
          plan="pro"
        />
      )}
    </div>
  );
}

type StripeModalProps = {
  open: boolean;
  setOpen: (value: boolean) => void;
  isYearly: boolean;
  plan: 'pro';
};

function StripeModal({ open, isYearly, plan, setOpen }: StripeModalProps) {
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();

  const {
    data: paymentLink,
    isLoading: paymentLinkLoading,
    error: paymentLinkError
  } = platform.org.setup.billing.getOrgSubscriptionPaymentLink.useQuery(
    {
      orgShortcode,
      plan,
      period: isYearly ? 'yearly' : 'monthly'
    },
    {
      enabled: open
    }
  );

  const { data: overview } =
    platform.org.setup.billing.getOrgBillingOverview.useQuery(
      { orgShortcode },
      {
        enabled: open && paymentLink && !paymentLinkLoading,
        refetchOnWindowFocus: true,
        refetchInterval: ms('15 seconds')
      }
    );

  // Open payment link once payment link is generated
  useEffect(() => {
    if (!open || paymentLinkLoading || !paymentLink) return;
    window.open(paymentLink.subLink, '_blank');
  }, [open, paymentLink, paymentLinkLoading]);

  // handle payment info update
  useEffect(() => {
    if (overview?.currentPlan === 'pro') {
      void utils.org.setup.billing.getOrgBillingOverview.invalidate({
        orgShortcode
      });
      setOpen(false);
    }
  }, [
    orgShortcode,
    overview,
    setOpen,
    utils.org.setup.billing.getOrgBillingOverview
  ]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Upgrade to Pro</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 p-2">
            {paymentLinkLoading ? (
              <span className="flex items-center gap-2">
                <SpinnerGap className="size-4 animate-spin" />
                Generating Payment Link
              </span>
            ) : paymentLink ? (
              'Waiting for Payment (This may take a few seconds)'
            ) : (
              <span className="text-red-9">{paymentLinkError?.message}</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 p-2">
          <span>
            We are waiting for your payment to be processed. It may take a few
            seconds for the payment to reflect in app.
          </span>
          {paymentLink && (
            <span>
              If a new tab was not opened,{' '}
              <a
                target="_blank"
                href={paymentLink.subLink}
                className="underline">
                open it manually.
              </a>
            </span>
          )}
          <span>
            {`If your payment hasn't been detected correctly, please try refreshing
            the page.`}
          </span>
          <span>If the issue persists, please contact support.</span>
        </div>

        <AlertDialogFooter>
          <Button
            onClick={() => setOpen(false)}
            className="w-full">
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
