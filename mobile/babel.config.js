// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@": "./src",
            "@api": "./src/api",
            "@components": "./src/components",
            "@hooks": "./src/hooks",
            "@screens": "./src/screens",
            "@styles": "./src/styles",
            "@theme": "./src/theme",
          },
        },
      ],

      // ⬇️ Reanimated v3+ için yeni plugin (en sonda olmalı)
      "react-native-reanimated/plugin",
    ],
  };
};
