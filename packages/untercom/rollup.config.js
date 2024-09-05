import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';

export default [
  {
    input: 'src/index.tsx',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs'
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm'
      },
      {
        file: 'dist/index.umd.js',
        format: 'umd',
        name: 'Untercom',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    ],
    external: ['react', 'react-dom'],
    plugins: [
      typescript(),
      resolve(),
      commonjs(),
      postcss({
        plugins: [tailwindcss, autoprefixer],
        extract: false,
        modules: false,
        inject: true,
        minimize: true
      }),
      terser()
    ]
  }
];
