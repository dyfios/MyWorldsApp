import babel from '@rollup/plugin-babel';

export default {
  root: '.',
  esbuild: false,  // Disable esbuild completely - let Babel handle all JS transforms
  build: {
    outDir: 'dist',
    target: 'esnext',
    lib: {
      entry: 'src/index.ts',
      name: 'MyWorldsClient',
      fileName: (format: string) => `myworlds-client.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [],
      plugins: [
        babel({
          babelHelpers: 'bundled',
          presets: [
            '@babel/preset-typescript',
            ['@babel/preset-env', {
              targets: {
                ie: '11'
              },
              useBuiltIns: false,
              modules: false
            }]
          ],
          plugins: [
            '@babel/plugin-transform-optional-chaining',
            '@babel/plugin-transform-nullish-coalescing-operator'
          ],
          extensions: ['.js', '.ts'],
          exclude: 'node_modules/**'
        })
      ],
      output: [
        {
          format: 'es'
        },
        {
          format: 'umd',
          name: 'MyWorldsClient'
        }
      ]
    },
    sourcemap: true,
    minify: 'terser',  // Use terser to strip comments
    terserOptions: {
      format: {
        comments: false  // Remove all comments
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env?.NODE_ENV || 'development')
  }
};