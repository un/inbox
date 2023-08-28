import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

export default <Partial<Config>>{
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter var', ...defaultTheme.fontFamily.sans],
        display: ['CalSans', ...defaultTheme.fontFamily.sans]
      }
    }
  }
  // plugins: [require('windy-radix-palette')]
};
