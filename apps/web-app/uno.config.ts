import { defineConfig } from 'unocss';
import presetUno from '@unocss/preset-uno';
import transformerVariantGroup from '@unocss/transformer-variant-group';
import { presetRadix } from 'unocss-preset-radix';

const radixColors = [
  // 'tomato',
  'red',
  //'crimson',
  'pink',
  // 'plum',
  'purple',
  // 'violet',
  // 'indigo',
  'blue',
  // 'sky',
  // 'cyan',
  // 'teal',
  // 'mint',
  'green',
  'grass',
  'lime',
  // 'yellow'
  // 'amber',
  'orange',
  // 'brown',
  // 'gray',
  // 'mauve',
  // 'slate',
  // 'sage',
  // 'olive',
  'sand'
  // 'gold',
  // 'bronze',
];
// manually setting  colors and scales so UnoCSS generates them for use in dynamic classes
const unoCssSafelist = (() => {
  const list: string[] = [];
  const colors = ['base', 'primary', ...radixColors];
  colors.forEach((color) => {
    list.push(
      `bg-${color}-3`,
      `bg-${color}-4`,
      `bg-${color}-5`,
      `bg-${color}-6`,
      `bg-${color}-9`,
      `bg-${color}-10`,
      `border-${color}-6`,
      `border-${color}-7`,
      `border-${color}-8`,
      `ring-${color}-6`,
      `ring-${color}-7`,
      `ring-${color}-8`,
      `ring-offset-${color}-6`,
      `ring-offset-${color}-7`,
      `ring-offset-${color}-8`,
      `text-${color}-1`,
      `text-${color}-11`,
      `text-${color}-12`
    );
  });
  return list;
})();

export default defineConfig({
  theme: {
    fontFamily: {
      sans: "'Inter', sans-serif",
      display: "'CalSans', display"
    }
  },
  safelist: [...unoCssSafelist],
  transformers: [transformerVariantGroup()],
  preflights: [
    {
      // @ts-ignore
      getCSS: ({ theme }) => {
        // @ts-ignore
        const bg = theme.colors?.sand?.[1] ?? '#333';
        // @ts-ignore
        const text = theme.colors?.black?.[12];
        return `body{ background-color: ${bg}; color: ${text}; };`;
      }
    }
  ],
  presets: [
    presetUno(),
    //@ts-ignore
    presetRadix({
      //@ts-ignore
      palette: [...radixColors],
      aliases: {
        primary: 'lime',
        secondary: 'yellow',
        base: 'sand'
      },
      darkSelector: '.dark'
    })
  ]
});
