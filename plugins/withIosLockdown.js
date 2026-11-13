// Expo config plugin: close two doors the iPhone app does not use.
//
// Expo registers the app's identifier as a link scheme, so another app could open this
// one through it; nothing here reads such a link. It also lets the app load from the
// local network, which only a development build needs. Both are removed, and
// scripts/check-ipa.mjs fails a build that brings either back.
const { withInfoPlist } = require('expo/config-plugins');

module.exports = function withIosLockdown(config) {
  return withInfoPlist(config, (cfg) => {
    delete cfg.modResults.CFBundleURLTypes;
    cfg.modResults.NSAppTransportSecurity = { NSAllowsArbitraryLoads: false };
    return cfg;
  });
};
