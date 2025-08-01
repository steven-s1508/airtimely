// scripts/check-version-bump.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const pkgPath = path.resolve(__dirname, "../package.json");
const appJsonPath = path.resolve(__dirname, "../app.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
const appVersion = appJson.expo && appJson.expo.version;

let lastVersion;
try {
	// Get the version from the last commit on package.json
	lastVersion = execSync("git show HEAD:package.json", { encoding: "utf8" });
	lastVersion = JSON.parse(lastVersion).version;
} catch (e) {
	// If package.json is new or not tracked, skip check
	process.exit(0);
}

// If app.json version is higher, update package.json version
if (appVersion && appVersion !== pkg.version && compareVersions(appVersion, pkg.version) > 0) {
	pkg.version = appVersion;
	fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
	console.log("\x1b[32m%s\x1b[0m", `package.json version updated to match app.json version (${appVersion})`);
	process.exit(0);
}

// If version not bumped, remind user
if (pkg.version === lastVersion) {
	console.error("\x1b[31m%s\x1b[0m", "Reminder: You have not bumped the version in package.json. Please update the version before pushing to GitHub.");
	process.exit(1);
}

// Compare two semver strings. Returns 1 if v1>v2, -1 if v1<v2, 0 if equal.
function compareVersions(v1, v2) {
	const a = v1.split(".").map(Number);
	const b = v2.split(".").map(Number);
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const diff = (a[i] || 0) - (b[i] || 0);
		if (diff !== 0) return diff > 0 ? 1 : -1;
	}
	return 0;
}
