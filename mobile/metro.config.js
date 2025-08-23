// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// RN build'lerini tercih et
config.resolver.resolverMainFields = ['react-native', 'module', 'main'];

module.exports = config;
