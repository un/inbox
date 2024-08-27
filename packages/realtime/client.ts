import { eventDataMaps, type EventDataMap } from './events';
import Pusher from 'pusher-js';
import type { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (data: any) => Promise<void> | void;

const customHandler = <P, D>(
  endpoint: string,
  params: P,
  headers: Record<string, string>,
  callback: (err: Error | null, data: D | null) => void
) => {
  fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(params)
  })
    .then((res) => {
      if (!res.ok) {
        return callback(new Error('Unauthorized'), null);
      } else {
        return res.json();
      }
    })
    .then((data) => callback(null, data as D))
    .catch((err) =>
      callback(err instanceof Error ? err : new Error('Unknown error'), null)
    );
};

export default class RealtimeClient {
  private client: Pusher | null = null;
  #connectionTimeout: NodeJS.Timeout | null = null;
  #channelSubscriptions = new Map<string, Map<string, Set<EventHandler>>>();
  #rootSubscriptions = new Map<string, Set<EventHandler>>();

  constructor(
    private config: {
      appKey: string;
      host: string;
      port?: number;
      authEndpoint: string;
      channelAuthorizationEndpoint: string;
    }
  ) {}

  public async connect({ orgShortcode }: { orgShortcode: string }) {
    if (this.client) return;
    const client = new Pusher(this.config.appKey, {
      wsHost: this.config.host,
      wsPort: this.config.port ? Number(this.config.port) : undefined,
      cluster: 'default',
      forceTLS: false,
      enabledTransports: ['ws', 'wss'],
      userAuthentication: {
        customHandler: (params, callback) =>
          customHandler(
            this.config.authEndpoint,
            params,
            { 'org-shortcode': orgShortcode },
            callback
          )
      },
      channelAuthorization: {
        customHandler: (params, callback) =>
          customHandler(
            this.config.channelAuthorizationEndpoint,
            params,
            { 'org-shortcode': orgShortcode },
            callback
          )
      }
    });

    client.signin();
    this.client = client;

    client.bind_global((event: string, data: unknown) => {
      const parser = eventDataMaps[event as keyof EventDataMap];
      if (parser) {
        const handlers = this.#rootSubscriptions.get(event);
        if (handlers) {
          for (const handler of handlers) {
            void handler(parser.parse(data));
          }
        }
      }
    });
    this.#syncChannels();

    return new Promise<void>((resolve, reject) => {
      this.#connectionTimeout = setTimeout(() => {
        this.client = null;
        reject(new Error('Connection timeout'));
      }, 10000);

      client.bind('pusher:signin_success', () => {
        client.unbind('pusher:signin_success');
        if (this.#connectionTimeout) clearTimeout(this.#connectionTimeout);
        resolve();
      });

      client.bind('pusher:error', (e: unknown) => {
        this.client = null;
        if (this.#connectionTimeout) clearTimeout(this.#connectionTimeout);
        reject(e as Error);
      });
    });
  }

  public disconnect() {
    if (this.client) {
      this.client.disconnect();
      if (this.#connectionTimeout) clearTimeout(this.#connectionTimeout);
      this.client = null;
    }
  }

  public subscribe<const T extends keyof EventDataMap>(
    event: T,
    callback: (data: z.infer<EventDataMap[T]>) => Promise<void> | void
  ) {
    const callbacks = this.#rootSubscriptions.get(event) ?? new Set();
    callbacks.add(callback);
    this.#rootSubscriptions.set(event, callbacks);
    return () => {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.#rootSubscriptions.delete(event);
      }
    };
  }

  public subscribeChannel(channel: string) {
    const existingChannel =
      this.#channelSubscriptions.get(channel) ??
      new Map<string, Set<EventHandler>>();

    return {
      listen: <T extends keyof EventDataMap>(
        event: T,
        callback: (data: z.infer<EventDataMap[T]>) => Promise<void> | void
      ) => {
        const callbacks = existingChannel.get(event) ?? new Set();
        callbacks.add(callback);
        existingChannel.set(event, callbacks);
        this.#channelSubscriptions.set(channel, existingChannel);
        this.#syncChannels();
        return () => {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            existingChannel.delete(event);
          }
          this.#syncChannels();
        };
      },
      unsubscribe: () => {
        this.#channelSubscriptions.delete(channel);
        this.#syncChannels();
      }
    };
  }

  #syncChannels() {
    if (!this.client) return;
    const all = this.client.allChannels().map((c) => c.name);
    const channelsToSubscribe = Array.from(
      this.#channelSubscriptions.keys()
    ).filter((channel) => !all.includes(channel));
    const channelsToUnsubscribe = all.filter(
      (channel) => !this.#channelSubscriptions.has(channel)
    );
    channelsToSubscribe.forEach((channel) => {
      this.client
        ?.subscribe(channel)
        .bind_global((event: string, data: unknown) => {
          const eventHandlers = this.#channelSubscriptions.get(channel);
          if (eventHandlers) {
            const parser = eventDataMaps[event as keyof EventDataMap];
            const subscribers = eventHandlers.get(event);
            if (subscribers && parser) {
              for (const handler of subscribers) {
                void handler(parser.parse(data));
              }
            }
          }
        });
    });
    channelsToUnsubscribe.forEach((channel) => {
      this.client?.unsubscribe(channel);
    });
  }

  public get isConnected() {
    return !!this.client && this.client.connection.state === 'connected';
  }
}
