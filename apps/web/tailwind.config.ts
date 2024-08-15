import typographyPlugin from '@tailwindcss/typography';
import { fontFamily } from 'tailwindcss/defaultTheme';
import { createPlugin } from 'windy-radix-palette';
import animatePlugin from 'tailwindcss-animate';
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const colors = createPlugin();

const modifierPlugin = plugin((_) => {
  _.addVariant('shift-key', '.shift-key &');
  _.addVariant('ctrl-key', '.ctrl-key &');
  _.addVariant('alt-key', '.alt-key &');
  _.addVariant('meta-key', '.meta-key &');
});

const linkPlugin = plugin(function ({ addUtilities }) {
  addUtilities({
    '.editor-content a': {
      cursor: 'pointer'
    }
  });
});

const config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx,mdx}',
    './app/**/*.{ts,tsx,mdx}',
    './src/**/*.{ts,tsx,mdx}'
  ],
  prefix: '',
  theme: {
    fontFamily: {
      sans: ['var(--font-inter)', ...fontFamily.sans],
      display: ['var(--font-cal-sans)', ...fontFamily.sans],
      mono: [...fontFamily.mono]
    },
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      typography: {
        DEFAULT: {
          css: {
            'blockquote p:first-of-type::before': false,
            'blockquote p:first-of-type::after': false
          }
        }
      },
      colors: {
        accent: colors.alias('cyan'),
        base: colors.alias('slate'),
        border: 'var(--slate6)',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'var(--slate1)',
        foreground: 'var(--slate12)',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%': { opacity: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'caret-blink': 'caret-blink 1.25s ease-out infinite'
      }
    }
  },
  plugins: [
    colors.plugin,
    animatePlugin,
    typographyPlugin(),
    modifierPlugin,
    linkPlugin
  ]
} satisfies Config;

export default config;
