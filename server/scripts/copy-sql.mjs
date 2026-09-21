/** Copies .sql files from src/ into dist/, preserving layout. tsc ignores them. */
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../src");
const DIST = path.resolve(import.meta.dirname, "../dist");

let copied = 0;
for (const entry of fs.globSync("**/*.sql", { cwd: SRC })) {
	const to = path.join(DIST, entry);
	fs.mkdirSync(path.dirname(to), { recursive: true });
	fs.copyFileSync(path.join(SRC, entry), to);
	copied++;
}
console.log(`copied ${copied} .sql file(s) into dist/`);
