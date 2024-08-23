import Link from 'next/link';
import React from 'react';

interface WelcomeMessageProps {
  orgShortcode: string;
}

const WelcomeMessage1 = () => <p>Hey Welcome to Uninbox!</p>;

const WelcomeMessage2 = ({ orgShortcode }: WelcomeMessageProps) => (
  <p>
    If you&apos;re just trying this out, you can claim your uninbox.me email
    address in{' '}
    <Link
      href={`/${orgShortcode}/settings/user/addresses`}
      className="text-blue-500 hover:underline">
      Settings &gt; User &gt; Address
    </Link>
    .
  </p>
);

const WelcomeMessage3 = () => (
  <p>
    To get the best of Uninbox for your team, add your own domain. This will
    unlock unlimited email addresses (not aliases), the full power of spaces,
    and the ability to scale your org communications.
  </p>
);

const WelcomeMessage4 = ({ orgShortcode }: WelcomeMessageProps) => (
  <p>
    You can add your own email domain by going to{' '}
    <Link
      href={`/${orgShortcode}/settings/org/mail/domains`}
      className="text-blue-500 hover:underline">
      Settings &gt; Mail &gt; Domains
    </Link>
    .
  </p>
);

const WelcomeMessage5 = () => (
  <p>
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
);

export const welcomeMessages = [
  WelcomeMessage1,
  WelcomeMessage2,
  WelcomeMessage3,
  WelcomeMessage4,
  WelcomeMessage5
];
