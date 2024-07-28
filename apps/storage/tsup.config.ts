import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['app.ts', 'tracing.ts'],
  outDir: '.output',
  format: 'esm',
  target: 'esnext',
  clean: true,
  bundle: true,
  treeshake: true,
  noExternal: [/^@u22n\/.*/],
  minify: false,
  banner: {
    js: [
      `import { createRequire } from 'module';`,
      `const require = createRequire(import.meta.url);`
    ].join('\n')
  },
  esbuildOptions: (options) => {
    options.legalComments = 'none';
  }
});
