import { Toaster } from '@/components/ui/sonner';
import { TRPCReactProvider } from '@/lib/trpc';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UnInbox Command',
  description: 'UnInbox Command Panel'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark h-svh w-full">
      <body className={(cn(inter.className), 'h-full font-sans')}>
        <TRPCReactProvider>
          {children}
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
