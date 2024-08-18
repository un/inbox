import { typeIdValidator } from '@u22n/utils/typeid';
import { z } from 'zod';

export const eventDataMaps = {
  'platform:update': z.object({ version: z.string() }),
  'convo:new': z.object({ publicId: typeIdValidator('convos') }),
  'convo:hidden': z.object({
    publicId: z.array(typeIdValidator('convos')).or(typeIdValidator('convos')),
    hidden: z.boolean()
  }),
  'convo:deleted': z.object({
    publicId: z.array(typeIdValidator('convos')).or(typeIdValidator('convos'))
  }),
  'convo:entry:new': z.object({
    convoPublicId: typeIdValidator('convos'),
    convoEntryPublicId: typeIdValidator('convoEntries')
  }),
  'admin:issue:refresh': z.object({})
} as const;

export type EventDataMap = typeof eventDataMaps;
