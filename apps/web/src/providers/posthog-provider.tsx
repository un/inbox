// app/providers.tsx
'use client';
import { cookieConsentGiven } from '../components/posthog-cookie-banner';
import { PostHogProvider } from 'posthog-js/react';
import posthog from 'posthog-js';
import { env } from '../env';

const initPostHog = () => {
  const persistence =
    cookieConsentGiven() === 'yes' ? 'localStorage+cookie' : 'memory';

  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: '/ingest',
    person_profiles: 'identified_only',
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    persistence
  });
};

if (
  typeof window !== 'undefined' &&
  env.NEXT_PUBLIC_POSTHOG_ENABLED === 'true'
) {
  initPostHog();
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  if (env.NEXT_PUBLIC_POSTHOG_ENABLED === 'true') {
    return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
  }
  return children;
}
