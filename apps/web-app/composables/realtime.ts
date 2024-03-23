import Pusher from 'pusher-js';
import { useRuntimeConfig } from '#imports';

export const useRealtime = () => {
  const {
    public: { platformUrl, realtime: realtimeConfig }
  } = useRuntimeConfig();

  const pusher = new Pusher(realtimeConfig.appKey, {
    wsHost: realtimeConfig.host,
    wsPort: Number(realtimeConfig.port!),
    cluster: 'default',
    forceTLS: platformUrl.startsWith('https'),
    enabledTransports: ['ws', 'wss'],
    userAuthentication: {
      customHandler: async (params, callback) => {
        const res = await fetch(`${platformUrl}/realtime/auth`, {
          body: JSON.stringify(params),
          method: 'POST',
          credentials: 'include'
        });
        if (!res.ok) {
          return callback(new Error('Unauthorized'), null);
        }
        callback(null, await res.json());
      }
    }
  });

  pusher.signin();
  return new Promise<RealtimeClient>((resolve, reject) => {
    pusher.bind('pusher:signin_success', () =>
      resolve(new RealtimeClient(pusher))
    );
    pusher.bind('pusher:signin_error', (e: unknown) => reject(e));
  });
};

class RealtimeClient {
  constructor(private client: Pusher) {}
  onEmail(callback: () => void) {
    this.client.bind('notify:email', callback);
    return this;
  }
}
