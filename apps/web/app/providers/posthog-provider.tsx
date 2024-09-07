// app/providers.tsx

import { PostHogProvider } from 'posthog-js/react';
import posthog from 'posthog-js';
import { env } from '../env';

const initPostHog = () => {
  posthog.init(env.PUBLIC_POSTHOG_KEY!, {
    api_host: '/ingest',
    person_profiles: 'identified_only',
    capture_pageview: false // Disable automatic pageview capture, as we capture manually
  });
};

if (typeof window !== 'undefined' && env.PUBLIC_POSTHOG_ENABLED === 'true') {
  initPostHog();
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  if (env.PUBLIC_POSTHOG_ENABLED === 'true') {
    return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
  }
  return children;
}
