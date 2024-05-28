export const uiColors = [
  'bronze',
  'gold',
  'brown',
  'orange',
  'tomato',
  'red',
  'ruby',
  'crimson',
  'pink',
  'plum',
  'purple',
  'violet',
  'iris',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'jade',
  'green',
  'grass'
] as const;

export type UiColor = (typeof uiColors)[number];
