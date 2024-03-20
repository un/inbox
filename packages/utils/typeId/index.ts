import { customType } from 'drizzle-orm/mysql-core';
import { TypeID, typeid } from 'typeid-js';
import { z } from 'zod';

export const typeIdLength = 26;

export const idTypes = {
  user: 'usr',
  org: 'org'
} as const;

type IdType = typeof idTypes;
type IdTypePrefixes = keyof typeof idTypes;

export const typeIdValidator = <const T extends IdTypePrefixes>(prefix: T) =>
  z
    .string()
    .startsWith(`${idTypes[prefix]}_`)
    .length(typeIdLength + idTypes[prefix].length) // suffix length + prefix length
    .transform(
      (input) =>
        TypeID.fromString(input)
          .asType(idTypes[prefix])
          .toString() as `${IdType[T]}_${string}`
    );

export const typeIdGenerator = <const T extends IdTypePrefixes>(prefix: T) =>
  typeid(idTypes[prefix]);

export const typeIdDataType = <const T extends IdTypePrefixes>(
  prefix: T,
  column: string
) =>
  customType<{
    data: `${IdType[T]}_${string}`;
    notNull: true;
    driverData: string;
  }>({
    dataType: () => `varchar(${typeIdLength + idTypes[prefix].length})`,
    fromDriver: (input) =>
      TypeID.fromString(input).toString() as `${IdType[T]}_${string}`,
    toDriver: (input) => input.toString()
  })(column);
