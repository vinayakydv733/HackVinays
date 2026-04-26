const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Map firebase/auth to @firebase/auth so Metro picks up the React Native bundle
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'firebase/auth') {
    return context.resolveRequest(context, '@firebase/auth', platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
