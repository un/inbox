import {
  json,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData
} from '@remix-run/react';
import { ModifierClassProvider } from './components/modifier-class-provider';
import { TooltipProvider } from '@/components/shadcn-ui/tooltip';
import { PostHogPageView } from './components/posthog-page-view';
import { PHProvider } from '@/providers/posthog-provider';
import { Toaster } from '@/components/shadcn-ui/sonner';
import { PWAManager } from './components/pwa-manager';
import type { LoaderFunction } from '@remix-run/node';
import { TRPCReactProvider } from '@/lib/trpc';
import { ManifestLink } from '@remix-pwa/sw';
import { ThemeProvider } from 'next-themes';
import { middleware } from './middleware';
import { EnvInjection } from './env';

import '@fontsource-variable/inter';
import '@/styles/globals.css';
import 'cal-sans';

export const loader = (({ request }) =>
  middleware(request, () =>
    json({
      ENV: Object.fromEntries(
        Object.entries(process.env).filter(([key]) => key.startsWith('PUBLIC_'))
      )
    })
  )) satisfies LoaderFunction;

export const shouldRevalidate = () => false;

export default function App() {
  const { ENV } = useLoaderData<typeof loader>();
  return (
    <html
      lang="en"
      className="h-full max-h-svh overflow-hidden antialiased"
      suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>UnInbox</title>
        <meta
          name="description"
          content="Open Source Email service"
        />
        <link
          rel="icon"
          href="/logo.png"
        />
        <ManifestLink />
        <Meta />
        <Links />
        <EnvInjection ENV={ENV} />
      </head>
      <body className="h-full font-sans">
        <PHProvider>
          <PostHogPageView />
          <ThemeProvider
            attribute="class"
            enableSystem
            enableColorScheme
            defaultTheme="system"
            disableTransitionOnChange>
            <ModifierClassProvider>
              <TooltipProvider>
                <TRPCReactProvider>
                  <Outlet />
                  <Toaster closeButton />
                  <PWAManager />
                </TRPCReactProvider>
              </TooltipProvider>
            </ModifierClassProvider>
          </ThemeProvider>
        </PHProvider>
        <Scripts />
        <ScrollRestoration />
      </body>
    </html>
  );
}
