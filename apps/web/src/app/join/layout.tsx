'use client';

export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-base-2 flex h-full w-full flex-col items-center justify-center">
      {children}
    </div>
  );
}
