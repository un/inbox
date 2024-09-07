import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/shadcn-ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/shadcn-ui/dialog';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';
import {
  loadStripe,
  type StripeEmbeddedCheckoutOptions
} from '@stripe/stripe-js';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn-ui/tabs';
import { Button } from '@/components/shadcn-ui/button';
import { useCallback, useRef, useState } from 'react';
import { useOrgShortcode } from '@/hooks/use-params';
import { Check } from '@phosphor-icons/react';
import { platform } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { env } from '@/env';

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
  if (!env.PUBLIC_BILLING_STRIPE_PUBLISHABLE_KEY) {
    throw new Error(
      'Stripe publishable key not set, cannot render Stripe modal'
    );
  }
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();
  const stripePromise = useRef(
    loadStripe(env.PUBLIC_BILLING_STRIPE_PUBLISHABLE_KEY)
  );

  const fetchClientSecret = useCallback(
    () =>
      utils.org.setup.billing.createCheckoutSession
        .fetch({
          orgShortcode,
          plan,
          period: isYearly ? 'yearly' : 'monthly'
        })
        .then((res) => res.checkoutSessionClientSecret),
    [
      isYearly,
      orgShortcode,
      plan,
      utils.org.setup.billing.createCheckoutSession
    ]
  );
  const onComplete = useCallback(() => {
    setOpen(false);
    setTimeout(() => void utils.org.setup.billing.invalidate(), 1000);
  }, [setOpen, utils.org.setup.billing]);

  const options = {
    fetchClientSecret,
    onComplete
  } satisfies StripeEmbeddedCheckoutOptions;

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}>
      <DialogContent className="w-[90vw] max-w-screen-lg p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Stripe Checkout</DialogTitle>
          <DialogDescription>Checkout with Stripe</DialogDescription>
        </DialogHeader>
        {open && (
          <EmbeddedCheckoutProvider
            options={options}
            stripe={stripePromise.current}>
            <EmbeddedCheckout className="*:rounded-lg" />
          </EmbeddedCheckoutProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
