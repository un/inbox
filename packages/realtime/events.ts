import { typeIdValidator } from '@u22n/utils';
import { z } from 'zod';

// Just a few examples, do the real implementation here
export const eventDataMaps = {
  'platform:update': z.string(),
  'convo:new': z.object({
    publicId: typeIdValidator('convos')
  }),
  'convo:hidden': z.object({
    publicId: typeIdValidator('convos'),
    hidden: z.boolean()
  }),
  'convo:entry:new': z.object({
    convoPublicId: typeIdValidator('convos'),
    convoEntryPublicId: typeIdValidator('convoEntries')
  }),
  'convo:updated': z.object({})
} as const;

export type EventDataMap = typeof eventDataMaps;
