import type { Cookie as LuciaCookie } from 'lucia';

export const capitalize = <T extends string>(str: T) =>
  (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>;

export const convertLuciaAttributesToHono = (
  attributes: LuciaCookie['attributes']
) => ({
  ...attributes,
  sameSite: attributes.sameSite ? capitalize(attributes.sameSite) : undefined
});
