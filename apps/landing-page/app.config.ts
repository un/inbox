export default defineAppConfig({
  ui: {
    primary: 'indigo',
    gray: 'zinc',
    variables: {
      light: {
        background: 'var(--color-gray-50)'
      },
      dark: {
        background: 'var(--color-gray-950)'
      }
    },
    button: {
      rounded: 'rounded-full',
      default: {
        size: 'md',
        color: 'black'
      }
    },
    input: {
      rounded: 'rounded-full'
    },
    header: {
      wrapper: 'lg:!border-transparent bg-gray-50 dark:bg-gray-950',
      links: {
        wrapper:
          'ring-1 ring-gray-200 dark:ring-gray-800 px-3 gap-x-0 rounded-full',
        base: 'py-2 px-4 font-medium transition-colors relative after:absolute after:-bottom-px after:inset-x-2 after:h-px after:rounded-full after:opacity-0 after:bg-gray-900 dark:after:bg-white after:transition-opacity',
        active: 'text-gray-900 dark:text-white after:opacity-100',
        inactive:
          'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      }
    },
    footer: {
      top: {
        wrapper: 'border-t border-gray-200 dark:border-gray-800',
        container: 'py-8 lg:py-16'
      },
      bottom: {
        wrapper: 'border-t border-gray-200 dark:border-gray-800'
      }
    },
    pricing: {
      card: {
        highlight: 'ring-gray-900 dark:ring-white',
        features: {
          item: {
            icon: {
              base: 'text-gray-900 dark:text-white'
            }
          }
        }
      }
    }
  }
});
