import { customType } from 'drizzle-orm/mysql-core';
import { TypeID, typeid } from 'typeid-js';
import { z } from 'zod';

export const typeIdLength = 26;

export const idTypes = {
  user: 'usr',
  org: 'org'
} as const;

type IdTypePrefixes = (typeof idTypes)[keyof typeof idTypes];

export const typeIdValidator = <T extends IdTypePrefixes>(prefix: T) =>
  z
    .string()
    .startsWith(`${prefix}_`)
    .length(typeIdLength + prefix.length) // suffix length + prefix length
    .transform(
      (input) =>
        TypeID.fromString(input).asType(prefix).toString() as `${T}_${string}`
    );

export const typeIdGenerator = <T extends IdTypePrefixes>(prefix: T) =>
  typeid(prefix);

export const typeIdDataType = <T extends IdTypePrefixes>(
  prefix: T,
  column: string
) =>
  customType<{ data: `${T}_${string}`; notNull: true; driverData: string }>({
    dataType: () => `varchar(${typeIdLength + prefix.length})`,
    fromDriver: (input) =>
      TypeID.fromString(input).toString() as `${T}_${string}`,
    toDriver: (input) => input.toString()
  })(column);
