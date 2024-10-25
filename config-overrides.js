const webpack = require('webpack');

module.exports = function override(config, env) {
  // Add mor polyfills if necessary
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "stream": require.resolve("stream-browserify"),
    
  };
  console.log("CONFIG-OVERRIDES.js");
  
  return config;
};