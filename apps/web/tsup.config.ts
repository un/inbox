import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server.ts'],
  outDir: 'build',
  format: 'esm',
  target: 'esnext',
  bundle: true,
  treeshake: true,
  noExternal: [/^@u22n\/.*/],
  minify: false,
  keepNames: true,
  banner: {
    js: [
      `import {createRequire } from 'module';`,
      `const require = createRequire(import.meta.url);`
    ].join('\n')
  },
  esbuildOptions: (options) => {
    options.legalComments = 'none';
  }
});
