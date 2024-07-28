'use client';

import {
  Turnstile,
  type TurnstileProps,
  type TurnstileInstance
} from '@marsidev/react-turnstile';
import { useTheme } from 'next-themes';
import { forwardRef } from 'react';
import { env } from '../env';
import React from 'react';

export const turnstileEnabled = Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export const TurnstileComponent = forwardRef<
  TurnstileInstance,
  Omit<TurnstileProps, 'siteKey'>
>(({ options, ...props }, ref) => {
  const { resolvedTheme } = useTheme();
  return turnstileEnabled ? (
    <div className="pointer-events-none absolute left-0 top-0 flex h-full w-full items-end justify-center p-4">
      <div className="pointer-events-auto">
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
    </div>
  ) : null;
});

TurnstileComponent.displayName = 'TurnstileComponent';
