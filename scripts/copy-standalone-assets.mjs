import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function copyDirectory(from, to) {
  if (!(await exists(from))) {
    return;
  }

  await rm(to, { force: true, recursive: true });
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
}

async function removeDotEnvFiles(directory) {
  const entries = [".env", ".env.local", ".env.development", ".env.production", ".env.test"];

  await Promise.all(
    entries.map((entry) => rm(path.join(directory, entry), { force: true, recursive: true })),
  );
}

if (!(await exists(standaloneDir))) {
  throw new Error("Missing .next/standalone. Run `pnpm run build` before copying assets.");
}

await copyDirectory(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));
await copyDirectory(path.join(root, "public"), path.join(standaloneDir, "public"));

// Next 16 can trace only package manifests for some pnpm dependencies. The
// standalone server still imports their runtime files after junctions are
// materialized for an Electron package.
const runtimeDependencies = [
  ["@img", "colour"],
  ["@img", "sharp-win32-x64"],
  ["@next", "env"],
  ["@swc", "helpers"],
  ["client-only"],
  ["detect-libc"],
  ["sharp"],
];

for (const dependency of runtimeDependencies) {
  await copyDirectory(
    path.join(root, "node_modules", ...dependency),
    path.join(standaloneDir, "node_modules", ...dependency),
  );
}

await removeDotEnvFiles(standaloneDir);
