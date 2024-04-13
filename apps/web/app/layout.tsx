import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { cn } from '@/lib/utils';
import { Theme } from '@radix-ui/themes';
import { ThemeProvider } from 'next-themes';
import { TRPCReactProvider } from '@/lib/trpc';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-inter'
});

const calSans = localFont({
  src: './fonts/CalSans-SemiBold.woff2',
  weight: '600',
  variable: '--font-cal-sans'
});

export const metadata: Metadata = {
  title: 'UnInbox',
  description: 'Open Source Email service'
};

function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full font-sans antialiased"
      suppressHydrationWarning>
      <body className={cn(inter.variable, calSans.variable, 'h-full')}>
        <ThemeProvider
          attribute="class"
          enableSystem
          enableColorScheme
          defaultTheme="system"
          disableTransitionOnChange>
          <Theme
            className="flex h-full flex-col"
            radius="medium">
            <TRPCReactProvider>{children}</TRPCReactProvider>
          </Theme>
        </ThemeProvider>
      </body>
    </html>
  );
}

export default RootLayout;
