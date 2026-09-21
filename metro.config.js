const { withNativeWind } = require("nativewind/metro");
const {
    getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

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

// The server/ workspace is a Node package the app never imports at runtime — only
// `import type { AppType }`, which Babel erases. Keep Metro out of its dependency
// tree, including the node_modules symlink npm workspaces creates for it.
config.resolver.blockList = [
	...(Array.isArray(config.resolver.blockList)
		? config.resolver.blockList
		: config.resolver.blockList
			? [config.resolver.blockList]
			: []),
	/[/\\]server[/\\]node_modules[/\\].*/,
	/[/\\]server[/\\]dist[/\\].*/,
	/[/\\]node_modules[/\\]airtimely-server[/\\].*/,
];

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