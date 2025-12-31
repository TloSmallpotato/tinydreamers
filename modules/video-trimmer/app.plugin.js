
const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Config plugin to integrate the VideoTrimmer native module
 */
const withVideoTrimmer = (config) => {
  return withPlugins(config, [
    // iOS configuration
    (config) => {
      return withDangerousMod(config, [
        'ios',
        async (config) => {
          const iosProjectPath = path.join(
            config.modRequest.platformProjectRoot,
            config.modRequest.projectName
          );
          
          // The module files will be automatically linked by Expo's autolinking
          console.log('VideoTrimmer: iOS module will be autolinked');
          
          return config;
        },
      ]);
    },
  ]);
};

module.exports = withVideoTrimmer;
