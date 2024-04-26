import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/app.ts'],
  format: 'esm',
  treeshake: true,
  noExternal: [/@u22n\/.+/], // We currently don't bundle our monorepo packages
  clean: true,
  minify: true
});
