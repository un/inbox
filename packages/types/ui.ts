export const uiColors = [
  'red',
  'pink',
  'purple',
  'blue',
  'green',
  'orange',
  'yellow',
  'cyan'
] as const;

export type UiColor = (typeof uiColors)[number];
