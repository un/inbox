import Stripe from 'stripe';
import type { StripeData } from '../types';
import { useRuntimeConfig } from '#imports';

export const useStripe = () => {
  const stripeData: StripeData = useRuntimeConfig().stripe;
  const sdk = new Stripe(stripeData.key, {
    apiVersion: '2023-10-16'
  });

  return {
    sdk,
    plans: stripeData.plans
  };
};
