// Copies the installed pdf.js worker into public/.
//
// pdf.js throws at runtime if the worker build and the API build differ, so
// this re-runs on every install to keep public/pdf.worker.min.mjs pinned to
// whatever version node_modules actually has.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const src = join(dirname(require.resolve("pdfjs-dist/package.json")), "build", "pdf.worker.min.mjs");
const dest = join(root, "public", "pdf.worker.min.mjs");

await mkdir(join(root, "public"), { recursive: true });
await copyFile(src, dest);
console.log(`✓ pdf worker → public/pdf.worker.min.mjs`);
