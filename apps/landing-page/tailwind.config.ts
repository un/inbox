import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

export default <Partial<Config>>{
  darkMode: 'class',
  content: ['docs/content/**/*.md'],
  safeList: ['items-end', 'items-start', 'rounded-br-none', 'rounded-bl-none'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cal Sans', ...defaultTheme.fontFamily.sans]
      }
    }
  }
};
