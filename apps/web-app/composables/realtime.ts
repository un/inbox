import { useRuntimeConfig } from '#imports';
import RealtimeClient from '@u22n/realtime/client';

export const useRealtime = () => {
  const client = new RealtimeClient(useRuntimeConfig().public.realtime);
  return {
    connect: client.connect.bind(client),
    disconnect: client.disconnect.bind(client),
    on: client.on.bind(client),
    onBroadcast: client.onBroadcast.bind(client)
  };
};
