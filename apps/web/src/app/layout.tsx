import { TooltipProvider } from '@/src/components/shadcn-ui/tooltip';
import { CookiesProvider } from 'next-client-cookies/server';
import { Toaster } from '@/src/components/shadcn-ui/sonner';
import { PublicEnvScript } from 'next-runtime-env';
import { TRPCReactProvider } from '@/src/lib/trpc';
import { ThemeProvider } from 'next-themes';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { cn } from '@/src/lib/utils';
import type { Metadata } from 'next';
import '@/src/styles/globals.css';

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
      className="h-full w-full font-sans antialiased"
      suppressHydrationWarning>
      <head>
        <PublicEnvScript />
      </head>
      <body
        className={cn(
          inter.variable,
          calSans.variable,
          'h-full max-h-svh overflow-hidden font-sans'
        )}>
        <CookiesProvider>
          <ThemeProvider
            attribute="class"
            enableSystem
            enableColorScheme
            defaultTheme="system"
            disableTransitionOnChange>
            <div className="flex h-svh w-full flex-col">
              <TooltipProvider>
                <TRPCReactProvider>
                  {children}
                  <Toaster />
                </TRPCReactProvider>
              </TooltipProvider>
            </div>
          </ThemeProvider>
        </CookiesProvider>
      </body>
    </html>
  );
}
