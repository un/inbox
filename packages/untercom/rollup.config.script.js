import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';

export default {
  input: 'src/script.tsx',
  output: {
    file: 'dist/untercom.js',
    format: 'iife',
    name: 'Untercom'
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true
    }),
    typescript(),
    resolve(),
    commonjs({
      include: /node_modules/
    }),
    postcss({
      plugins: [tailwindcss, autoprefixer],
      inject: true,
      minimize: true
    }),
    terser()
  ]
};
