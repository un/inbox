import { customType } from 'drizzle-orm/mysql-core';
import { TypeID, typeid } from 'typeid-js';
import { z } from 'zod';

const typeIdLength = 26;

export const idTypes = {
  account: 'a',
  accountSession: 'as',
  accountPasskey: 'ap',
  contacts: 'k',
  convos: 'c',
  convoAttachments: 'ca',
  convoEntries: 'ce',
  convoParticipants: 'cp',
  convoSubjects: 'cs',
  convoToSpaces: 'c2s',
  convoStatuses: 'css',
  convoTags: 'cst',
  domains: 'dom',
  emailRoutingRules: 'rr',
  emailRoutingRuleDestinations: 'rrd',
  emailIdentities: 'ei',
  emailIdentitiesPersonal: 'eip',
  emailIdentitiesExternal: 'eie',
  postalServers: 'ps',
  teams: 't',
  teamMembers: 'tm',
  org: 'o',
  orgInvitations: 'oi',
  orgMembers: 'om',
  orgMemberProfile: 'omp',
  spaces: 's',
  spaceMembers: 'sm',
  spaceStatuses: 'ss',
  spaceTags: 'st'
} as const;

type IdType = typeof idTypes;
type ReversedIdType = { [K in keyof IdType as IdType[K]]: K };

const reversedIdTypes = Object.fromEntries(
  Object.entries(idTypes).map(([x, y]) => [y, x])
) as ReversedIdType;

type IdTypePrefixes = keyof typeof idTypes;
export type TypeId<T extends IdTypePrefixes> = `${IdType[T]}_${string}`;

export const typeIdValidator = <const T extends IdTypePrefixes>(prefix: T) =>
  z
    .string()
    .startsWith(`${idTypes[prefix]}_`)
    .length(typeIdLength + idTypes[prefix].length + 1) // suffix length + prefix length + underscore
    .transform(
      (input) =>
        TypeID.fromString(input).asType(idTypes[prefix]).toString() as TypeId<T>
    );

export const typeIdGenerator = <const T extends IdTypePrefixes>(prefix: T) =>
  typeid(idTypes[prefix]).toString() as TypeId<T>;

export const typeIdDataType = <const T extends IdTypePrefixes>(
  prefix: T,
  column: string
) =>
  customType<{
    data: TypeId<T>;
    notNull: true;
    driverData: string;
  }>({
    dataType: () => `char(${typeIdLength + idTypes[prefix].length + 1})`, // suffix length + prefix length + underscore
    fromDriver: (input) => TypeID.fromString(input).toString() as TypeId<T>,
    toDriver: (input) => input.toString()
  })(column);

export const validateTypeId = <const T extends IdTypePrefixes>(
  prefix: T,
  data: unknown
): data is TypeId<T> => typeIdValidator(prefix).safeParse(data).success;

export const inferTypeId = <T extends keyof ReversedIdType>(
  input: `${T}_${string}`
) => reversedIdTypes[TypeID.fromString(input).getType() as T];
