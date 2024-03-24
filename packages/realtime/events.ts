import { typeIdValidator } from '@u22n/utils';
import { z } from 'zod';

// Just a few examples, do the real implementation here
export const eventDataMaps = {
  'platform:update': z.string(),
  'convo:created': z.object({
    publicId: typeIdValidator('convos'),
    subject: z.string()
  }),
  'convo:updated': z.object({})
} as const;

export type EventDataMap = typeof eventDataMaps;
