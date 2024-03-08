import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  splitting: false,
  treeshake: true,
  format: 'esm'
});
