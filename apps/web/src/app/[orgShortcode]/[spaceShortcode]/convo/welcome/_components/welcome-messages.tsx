'use client';

import { welcomeMessages } from '../_data/welcomeMessages';
import { useOrgShortcode } from '@/src/hooks/use-params';
import { WelcomeMessage } from './welcome-message';
import React, { useState, useEffect } from 'react';

export function WelcomeMessages() {
  const orgShortcode = useOrgShortcode();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => {
        if (prev < welcomeMessages.length - 1) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex w-full flex-1 flex-col overflow-y-auto p-4">
      {welcomeMessages.slice(0, messageIndex + 1).map((Message, index) => (
        <WelcomeMessage key={index}>
          <Message orgShortcode={orgShortcode} />
        </WelcomeMessage>
      ))}
    </div>
  );
}
