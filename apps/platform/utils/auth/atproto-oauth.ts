import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { seconds } from '@u22n/utils/ms';
import { storage } from '~platform/storage';
import { env } from '~platform/env';

export const atprotoOAuthClient = new NodeOAuthClient({
  clientMetadata: {
    client_id: env.ATPROTO_CLIENT_ID,
    client_name: 'UnInbox',
    client_uri: env.WEBAPP_URL,
    redirect_uris: [env.ATPROTO_REDIRECT_URI],
    scope: 'atproto transition:generic',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true
  },
  stateStore: {
    async set(key, internalState) {
      await storage.oauthState.setItem(key, JSON.stringify(internalState));
    },
    async get(key) {
      const raw = await storage.oauthState.getItem(key);
      if (!raw) return undefined;
      return JSON.parse(raw as string) as Parameters<
        (typeof this)['set']
      >[1];
    },
    async del(key) {
      await storage.oauthState.removeItem(key);
    }
  },
  sessionStore: {
    async set(sub, session) {
      await storage.oauthSession.setItem(sub, JSON.stringify(session));
    },
    async get(sub) {
      const raw = await storage.oauthSession.getItem(sub);
      if (!raw) return undefined;
      return JSON.parse(raw as string) as Parameters<
        (typeof this)['set']
      >[1];
    },
    async del(sub) {
      await storage.oauthSession.removeItem(sub);
    }
  }
});

export async function getAuthorizationUrl(handle: string): Promise<string> {
  const url = await atprotoOAuthClient.authorize(handle, {
    scope: 'atproto transition:generic'
  });
  return url.toString();
}

export async function handleOAuthCallback(params: URLSearchParams): Promise<{
  did: string;
  handle: string;
}> {
  const { session } = await atprotoOAuthClient.callback(params);
  return {
    did: session.did,
    handle: session.did // resolved handle returned below
  };
}

export { seconds };
