import { TooltipProvider } from '@/src/components/shadcn-ui/tooltip';
import { CookieConsentBanner } from '@/src/components/cookie-banner';
import { PHProvider } from '@/src/providers/posthog-provider';
import { CookiesProvider } from 'next-client-cookies/server';
import { Toaster } from '@/src/components/shadcn-ui/sonner';
import { PublicEnvScript } from 'next-runtime-env';
import { TRPCReactProvider } from '@/src/lib/trpc';
import { ThemeProvider } from 'next-themes';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { cn } from '@/src/lib/utils';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import '@/src/styles/globals.css';

const PostHogPageView = dynamic(() => import('./posthog'), {
  ssr: false
});

const inter = Inter({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-inter'
});

const calSans = localFont({
  src: '../fonts/CalSans-SemiBold.woff2',
  weight: '600',
  variable: '--font-cal-sans'
});

export const metadata: Metadata = {
  title: 'UnInbox',
  description: 'Open Source Email service',
  icons: '/logo.png'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full max-h-svh overflow-hidden antialiased"
      suppressHydrationWarning>
      <head>
        <PublicEnvScript />
      </head>
      <PHProvider>
        <body
          className={cn(inter.variable, calSans.variable, 'h-full font-sans')}>
          <PostHogPageView />
          <CookiesProvider>
            <ThemeProvider
              attribute="class"
              enableSystem
              enableColorScheme
              defaultTheme="system"
              disableTransitionOnChange>
              <TooltipProvider>
                <TRPCReactProvider>
                  {children}
                  <Toaster />
                  <CookieConsentBanner />
                </TRPCReactProvider>
              </TooltipProvider>
            </ThemeProvider>
          </CookiesProvider>
        </body>
      </PHProvider>
    </html>
  );
}
