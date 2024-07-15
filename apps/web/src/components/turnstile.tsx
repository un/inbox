'use client';

import React from 'react';
import {
  Turnstile,
  type TurnstileProps,
  type TurnstileInstance
} from '@marsidev/react-turnstile';
import { useTheme } from 'next-themes';
import { forwardRef } from 'react';
import { env } from '../env';

export const turnstileEnabled = Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export const TurnstileComponent = forwardRef<
  TurnstileInstance,
  Omit<TurnstileProps, 'siteKey'>
>(({ options, ...props }, ref) => {
  const { resolvedTheme } = useTheme();
  return turnstileEnabled ? (
    <div className="flex items-center justify-center">
      <Turnstile
        ref={ref}
        siteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        options={{
          theme: (resolvedTheme as 'dark' | 'light') ?? 'auto',
          ...options
        }}
        {...props}
      />
    </div>
  ) : null;
});

TurnstileComponent.displayName = 'TurnstileComponent';
