const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Increase the maximum string literals in a bundle
config.maxWorkers = 2;
config.transformer.minifierConfig = {
	...config.transformer.minifierConfig,
	compress: {
		...config.transformer.minifierConfig?.compress,
		reduce_vars: false,
		inline: 1, // Reduced from default
		drop_console: true, // Remove console.logs in production
	},
};

// Add additional resolver for React Native
config.resolver.sourceExts = [...config.resolver.sourceExts, "mjs"];
config.resolver.extraNodeModules = {
	...config.resolver.extraNodeModules,
	"react-native": require.resolve("react-native"),
};

// Add support for Hermes
config.transformer.unstable_allowRequireContext = true;

// Only export once, with NativeWind
module.exports = withNativeWind(config, { input: "./global.css" });
