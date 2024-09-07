import type { WebAppManifest } from '@remix-pwa/dev';
import { json } from '@remix-run/node';

export const loader = () => {
  return json(
    {
      name: 'UnInbox',
      short_name: 'UnInbox',
      start_url: '/',
      display: 'standalone',
      background_color: '#18191b',
      theme_color: '#18191b',
      description: 'Open Source Email service',
      icons: [
        {
          src: '/logo.png',
          type: 'image/png',
          sizes: '400x400',
          purpose: 'any'
        }
      ]
    } as WebAppManifest,
    {
      headers: {
        'Cache-Control': 'public, max-age=600',
        'Content-Type': 'application/manifest+json'
      }
    }
  );
};
