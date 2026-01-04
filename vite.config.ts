export default {
  root: '.',
  build: {
    outDir: 'dist',
    target: 'es2017',  // ES2017 supports classes, async/await, but transpiles optional chaining
    lib: {
      entry: 'src/index.ts',
      name: 'MyWorldsClient',
      fileName: (format: string) => `myworlds-client.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [],
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
    minify: 'terser'
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