import { useRuntimeConfig } from '#imports';
import Pusher from 'pusher';

type RealtimeConfig = {
  host: string;
  port: string;
  appId: string;
  appKey: string;
  appSecret: string;
};

const realtimeConfig = useRuntimeConfig().realtime as RealtimeConfig;

export const pusher = new Pusher({
  host: realtimeConfig.host,
  port: realtimeConfig.port,
  appId: realtimeConfig.appId,
  key: realtimeConfig.appKey,
  secret: realtimeConfig.appSecret,
  cluster: 'default',
  timeout: 10000
});
