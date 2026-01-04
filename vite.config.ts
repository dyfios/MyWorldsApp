export default {
  root: '.',
  esbuild: {
    target: 'es2016',  // Ensure esbuild transforms optional chaining, nullish coalescing, etc.
    legalComments: 'none',  // Remove comments that might contain modern syntax
    charset: 'ascii',  // Convert non-ASCII characters to escape sequences
  },
  build: {
    outDir: 'dist',
    target: 'es2016',  // ES2016 - more conservative for JINT compatibility
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
    minify: 'esbuild'  // Use esbuild minification to strip comments
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