import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/index.tsx',
  output: {
    file: 'dist/untercom.js',
    format: 'iife',
    name: 'Untercom'
  },
  plugins: [typescript(), resolve(), commonjs(), terser()]
};
