import { customType } from 'drizzle-orm/mysql-core';
import { TypeID, typeid } from 'typeid-js';
import { z } from 'zod';

const typeIdLength = 26;

export const idTypes = {
  user: 'u',
  userProfile: 'up',
  org: 'o',
  orgInvitations: 'oi',
  orgMembers: 'om',
  userGroups: 'g',
  userGroupMembers: 'gm',
  domains: 'dom',
  postalServers: 'ps',
  contacts: 'cntc',
  emailRoutingRules: 'rr',
  emailIdentities: 'ei',
  emailIdentitiesPersonal: 'eip',
  emailIdentitiesExternal: 'eie',
  convos: 'c',
  convoSubjects: 'cs',
  convoParticipants: 'cp',
  convoAttachments: 'ca',
  convoEntries: 'ce'
} as const;

type IdType = typeof idTypes;
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
    dataType: () => `varchar(${typeIdLength + idTypes[prefix].length + 1})`, // suffix length + prefix length + underscore
    fromDriver: (input) => TypeID.fromString(input).toString() as TypeId<T>,
    toDriver: (input) => input.toString()
  })(column);

export const validateTypeId = <const T extends IdTypePrefixes>(
  prefix: T,
  data: string
): data is TypeId<T> => typeIdValidator(prefix).safeParse(data).success;
