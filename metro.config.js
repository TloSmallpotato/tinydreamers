
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Use turborepo to restore the cache when possible
config.cacheStores = [
  new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
];

// Improve web stability by reducing watch sensitivity
config.watchFolders = [__dirname];

// Optimize resolver to prevent unnecessary rebuilds
config.resolver = {
  ...config.resolver,
  // Disable symlink resolution which can cause watch issues
  resolveRequest: null,
};

// Reduce file watching overhead
config.server = {
  ...config.server,
  // Increase debounce to prevent rapid rebuilds
  reloadOnChange: true,
};

module.exports = config;
