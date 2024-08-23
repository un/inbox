'use client';

import { welcomeMessages } from '../_data/welcomeMessages';
import { useOrgShortcode } from '@/src/hooks/use-params';
import React, { useState, useEffect } from 'react';
import { WelcomeMessage } from './WelcomeMessage';

export function WelcomeMessages() {
  const orgShortcode = useOrgShortcode();
  const [displayedMessages, setDisplayedMessages] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayedMessages((prev) => {
        if (prev.length < welcomeMessages.length) {
          return [...prev, welcomeMessages[prev.length]];
        }
        clearInterval(timer);
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex w-full flex-1 flex-col overflow-y-auto p-4">
      {displayedMessages.map((message, index) => (
        <WelcomeMessage
          key={index}
          content={message(orgShortcode)}
          author={{ name: 'UnInbox Team', avatarUrl: '/uninbox-logo.png' }}
        />
      ))}
    </div>
  );
}
