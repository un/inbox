import { useRuntimeConfig } from '#imports';
import RealtimeServer from '@u22n/realtime/server';
export const realtime = new RealtimeServer(useRuntimeConfig().realtime);
