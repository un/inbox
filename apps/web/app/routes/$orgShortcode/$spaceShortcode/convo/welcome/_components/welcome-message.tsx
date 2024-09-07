import type React from 'react';

interface WelcomeMessageProps {
  children: React.ReactNode;
}

export function WelcomeMessage({ children }: WelcomeMessageProps) {
  return (
    <div className="mb-4 flex items-start">
      <img
        src="/uninbox-logo.png"
        alt="UnInbox Team"
        className="mr-3 h-8 w-8 rounded-full"
      />
      <div>
        <p className="font-semibold">UnInbox Team</p>
        {children}
      </div>
    </div>
  );
}
