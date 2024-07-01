'use client';

export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="w-full text-center">
        <h1 className="font-display text-2xl">Let&apos;s Make your</h1>
        <h2 className="font-display text-5xl">UnInbox</h2>
        {children}
      </div>
    </div>
  );
}
