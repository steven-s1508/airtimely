module.exports = function (api) {
	api.cache(true);

	return {
		presets: [
			[
				"babel-preset-expo",
				{
					jsxImportSource: "nativewind",
				},
			],
			"nativewind/babel",
		],

		plugins: [
			[
				"module-resolver",
				{
					root: ["./"],

					alias: {
						"@": "./",
						"@src": "./src",
						"@components": "./src/components",
						"@assets": "./src/assets",
						"@styles": "./src/styles",
						"@utils": "./src/utils",
						"@types": "./src/types",
						"@constants": "./src/constants",
						"tailwind.config": "./tailwind.config.js",
					},
				},
			],
			[
				"react-native-reanimated/plugin",
				{
					"module-resolver": {
						alias: {
							"^react-native$": "react-native",
						},
					},
				},
			],
		],
	};
};
