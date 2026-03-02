import { env } from '@/src/env';

export const dynamic = 'force-dynamic';

export function GET() {
  const metadata = {
    client_id: env.NEXT_PUBLIC_PLATFORM_URL
      ? `${env.NEXT_PUBLIC_PLATFORM_URL}/oauth/client-metadata.json`
      : `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/oauth/client-metadata.json`,
    client_name: 'UnInbox',
    client_uri: env.NEXT_PUBLIC_PLATFORM_URL ?? 'http://localhost:3000',
    redirect_uris: [
      `${env.NEXT_PUBLIC_PLATFORM_URL ?? 'http://localhost:3000'}/oauth/callback`
    ],
    scope: 'atproto transition:generic',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true
  };

  return Response.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
