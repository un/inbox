import { typeIdValidator } from '@u22n/utils/typeid';
import { z } from 'zod';

export const eventDataMaps = {
  'platform:update': z.string(),
  'convo:new': z.object({
    publicId: typeIdValidator('convos'),
    spaceShortcode: z.string().nullable()
  }),
  'convo:hidden': z.object({
    publicId: z.array(typeIdValidator('convos')).or(typeIdValidator('convos')),
    spaceShortcode: z.string().nullable(),
    hidden: z.boolean()
  }),
  'convo:deleted': z.object({
    publicId: z.array(typeIdValidator('convos')).or(typeIdValidator('convos')),
    spaceShortcode: z.string().nullable()
  }),
  'convo:entry:new': z.object({
    convoPublicId: typeIdValidator('convos'),
    convoEntryPublicId: typeIdValidator('convoEntries')
  }),
  'admin:issue:refresh': z.null()
} as const;

export type EventDataMap = typeof eventDataMaps;
