import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
const radixColors = require('@radix-ui/colors');
import { createPlugin } from 'windy-radix-palette';

const colors = createPlugin();

export default <Partial<Config>>{
  darkMode: 'class',
  plugins: [colors.plugin],
  content: ['docs/content/**/*.md'],
  safeList: ['items-end', 'items-start', 'rounded-br-none', 'rounded-bl-none'],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter var', ...defaultTheme.fontFamily.sans],
        display: ['CalSans', ...defaultTheme.fontFamily.sans]
      },
      colors: {
        primary: colors.alias('lime'),
        base: colors.alias('sand')
      }
    }
  }
};
