import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copies the OpenCascade WASM importer into /public so the browser can fetch it.
 *
 * Runs on postinstall rather than committing the payload: the .wasm is ~7 MB of
 * build output that would bloat every clone and go stale against the package.
 * This way `npm install` on a fresh machine always produces a matching copy.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "occt-import-js", "dist");
const to = join(root, "public", "occt");

const FILES = ["occt-import-js.wasm", "occt-import-js.js"];

if (!existsSync(from)) {
  // Not fatal: STEP import is one feature, and failing install over it would be
  // worse than starting without it.
  console.warn(
    "[copy-occt] occt-import-js not found; STEP component import will be unavailable.",
  );
  process.exit(0);
}

await mkdir(to, { recursive: true });

for (const file of FILES) {
  await copyFile(join(from, file), join(to, file));
}

console.log(`[copy-occt] copied ${FILES.length} files to public/occt`);
