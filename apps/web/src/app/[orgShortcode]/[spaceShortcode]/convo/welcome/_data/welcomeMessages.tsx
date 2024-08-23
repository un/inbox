import Link from 'next/link';
import React from 'react';

export const welcomeMessages = [
  () => <p>Hey Welcome to Uninbox!</p>,
  (orgShortcode: string) => (
    <p>
      If you're just trying this out, you can claim your uninbox.me email
      address in{' '}
      <Link
        href={`/${orgShortcode}/settings/user/addresses`}
        className="text-blue-500 hover:underline">
        Settings &gt; User &gt; Address
      </Link>
      .
    </p>
  ),
  () => (
    <p>
      To get the best of Uninbox for your team, add your own domain. This will
      unlock unlimited email addresses (not aliases), the full power of spaces,
      and the ability to scale your org communications.
    </p>
  ),
  (orgShortcode: string) => (
    <p>
      You can add your own email domain by going to{' '}
      <Link
        href={`/${orgShortcode}/settings/org/mail/domains`}
        className="text-blue-500 hover:underline">
        Settings &gt; Mail &gt; Domains
      </Link>
      .
    </p>
  ),
  () => (
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
  )
];
