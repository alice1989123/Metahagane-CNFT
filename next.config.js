const path = require("path");

module.exports = {
  reactStrictMode: true,
  webpack(config) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,

      // importAwait: true,
    };
    return config;
  },
};
