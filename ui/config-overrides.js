const path = require('path');

module.exports = function override(config, env) {
  // Reduce bundle splitting complexity that can cause hanging
  if (env === 'production') {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
      // Disable some optimizations that can cause hangs on low-memory systems
      minimize: process.env.DISABLE_MINIMIZE !== 'true',
    };

    // Add performance budgets to prevent infinite optimization loops
    config.performance = {
      hints: false,
      maxAssetSize: 512000,
      maxEntrypointSize: 512000,
    };
  }

  return config;
};