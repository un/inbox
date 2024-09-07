import { useSearchParams, useLocation } from '@remix-run/react';
import { usePostHog } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogPageView() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const posthog = usePostHog();
  useEffect(() => {
    // Track pageviews
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', {
        $current_url: url
      });
    }
  }, [pathname, searchParams, posthog]);

  return null;
}
