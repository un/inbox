'use client';
import { usePostHog } from 'posthog-js/react';
import { Button } from './shadcn-ui/button';
import { useState, useEffect } from 'react';
import React from 'react';

type ConsentStatus = 'undecided' | 'yes' | 'no';

// Extract consent management logic
const useConsentManagement = () => {
  const [consentGiven, setConsentGiven] =
    useState<ConsentStatus>(cookieConsentGiven());
  const posthog = usePostHog();

  const handleConsent = (decision: 'yes' | 'no') => {
    localStorage.setItem('cookie_consent', decision);
    setConsentGiven(decision);
    decision === 'yes'
      ? posthog.opt_in_capturing()
      : posthog.opt_out_capturing();
  };

  return { consentGiven, handleConsent };
};

// Separate presentational component
interface ConsentBannerUIProps {
  onAccept: () => void;
  onDecline: () => void;
}

const ConsentBannerUI: React.FC<ConsentBannerUIProps> = ({
  onAccept,
  onDecline
}) => (
  <div className="fixed bottom-0 left-0 right-0 bg-gray-100 p-4">
    <p className="mb-2">
      We use cookies to improve your experience. Please accept cookies to help
      us improve.
    </p>
    <div className="flex space-x-4">
      <Button onClick={onAccept}>Accept cookies</Button>
      <Button
        variant="secondary"
        onClick={onDecline}>
        Decline cookies
      </Button>
    </div>
  </div>
);

export function cookieConsentGiven(): ConsentStatus {
  if (typeof window !== 'undefined') {
    return (
      (localStorage.getItem('cookie_consent') as ConsentStatus) ?? 'undecided'
    );
  }
  return 'undecided';
}

export function CookieConsentBanner() {
  const { consentGiven, handleConsent } = useConsentManagement();

  if (consentGiven !== 'undecided') {
    return null;
  }

  return (
    <ConsentBannerUI
      onAccept={() => handleConsent('yes')}
      onDecline={() => handleConsent('no')}
    />
  );
}
