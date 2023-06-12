export default defineAppConfig({
  ui: {
    primary: 'blue',
    gray: 'zinc',
    badge: {
      size: {
        xs: 'text-xs px-1.5 py-0.5',
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-2 py-1',
        lg: 'text-sm px-2.5 py-1.5',
        xl: 'text-base px-3 py-1.5',
        '2xl': 'text-base px-4 py-2',
        '3xl': 'text-lg px-4 py-2',
        '4xl': 'text-lg px-5 py-2.5'
      }
    }
  },
  umami: {
    version: 2
  }
});
