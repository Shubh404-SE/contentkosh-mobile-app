// babel-preset-expo already injects react-native-reanimated / react-native-worklets plugins
// when those packages are installed. Do NOT add them again here — duplicate plugins break Reanimated 4.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
