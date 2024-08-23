'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { useOrgShortcode } from '@/src/hooks/use-params';
import { TopBar } from './_components/top-bar';

interface Author {
  name: string;
  avatarUrl: string;
}

interface Message {
  content: React.ReactNode;
  author: Author;
}

function WelcomeMessage({ message }: { message: Message }) {
  return (
    <div className="py-4">
      <div className="group relative mr-auto flex w-fit gap-2">
        <div className="flex w-fit max-w-prose flex-col items-start gap-2 overflow-x-hidden">
          <div className="flex w-full flex-row items-center gap-2">
            <div className="flex flex-row items-end gap-2">
              <div className="flex flex-col items-start gap-1">
                <span className="text-base font-medium leading-none">
                  {message.author.name}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-base-3 flex w-fit max-w-full flex-row overflow-hidden rounded-2xl rounded-tl-sm px-3 py-2">
            <div className="prose dark:prose-invert prose-a:decoration-blue-9 text-base-12 w-fit min-w-min overflow-ellipsis text-pretty [overflow-wrap:anywhere]">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const orgShortcode = useOrgShortcode();
  const [displayedMessages, setDisplayedMessages] = useState<React.ReactNode[]>(
    []
  );

  useEffect(() => {
    const messages = [
      <p key="welcome">Hey Welcome to Uninbox!</p>,
      <p key="tryout">
        If you&apos;re just trying this out, you can claim your uninbox.me email
        address in{' '}
        <Link
          href={`/${orgShortcode}/settings/user/addresses`}
          className="text-blue-500 hover:underline">
          Settings &gt; User &gt; Address
        </Link>
        .
      </p>,
      <p key="team">
        To get the best of Uninbox for your team, add your own domain. This will
        unlock unlimited email addresses (not aliases), the full power of
        spaces, and the ability to scale your org communications.
      </p>,
      <p key="adddomain">
        You can add your own email domain by going to{' '}
        <Link
          href={`/${orgShortcode}/settings/org/mail/domains`}
          className="text-blue-500 hover:underline">
          Settings &gt; Mail &gt; Domains
        </Link>
        .
      </p>,
      <p key="guide">
        Need extra help? Check out our guide on{' '}
        <a
          href="https://guide.uninbox.com/docs/using-your-own-domain"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline">
          using your own domain
        </a>
        .
      </p>
    ];

    const timer = setInterval(() => {
      setDisplayedMessages((prev) => {
        if (prev.length < messages.length) {
          return [...prev, messages[prev.length]];
        }
        clearInterval(timer);
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orgShortcode]);

  return (
    <div className="flex h-full w-full min-w-0 flex-col rounded-2xl">
      <TopBar
        subjects={[{ subject: 'Welcome to UnInbox' }]}
        participants={[]}
        attachments={[]}
      />
      <div className="flex w-full flex-1 flex-col overflow-y-auto p-4">
        {displayedMessages.map((message, index) => (
          <WelcomeMessage
            key={index}
            message={{
              content: message,
              author: { name: 'UnInbox Team', avatarUrl: '/uninbox-logo.png' }
            }}
          />
        ))}
      </div>
    </div>
  );
}
