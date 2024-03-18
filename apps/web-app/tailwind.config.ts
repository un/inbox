import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import { createPlugin } from 'windy-radix-palette';

const colors = createPlugin();

export default <Partial<Config>>{
  darkMode: 'class',
  plugins: [colors.plugin],
  content: ['docs/content/**/*.md'],
  safeList: ['items-end', 'items-start', 'rounded-br-none', 'rounded-bl-none'],
  theme: {
    // colors: {},
    extend: {
      fontFamily: {
        body: ['Inter var', ...defaultTheme.fontFamily.sans],
        display: ['CalSans', ...defaultTheme.fontFamily.sans]
      },
      colors: {
        accent: colors.alias('bronze'),
        base: colors.alias('sand')
      },
      keyframes: {
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%': { opacity: '0' }
        }
      },
      animation: {
        'caret-blink': 'caret-blink 1.2s ease-out infinite'
      }
    }
  }
};
