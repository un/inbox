import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
const radixColors = require('@radix-ui/colors');
import { createPlugin } from 'windy-radix-palette';

const colors = createPlugin();

export default <Partial<Config>>{
  darkMode: 'class',
  plugins: [colors.plugin],
  content: ['docs/content/**/*.md'],
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
