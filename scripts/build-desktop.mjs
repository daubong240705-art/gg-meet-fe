import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

// `output: "export"` rejects route handlers and desktop-excluded pages. Move
// matching routes aside for the desktop build and restore them afterwards.
const EXCLUDED_ROUTES = [
  "src/app/api",
  "src/app/admin",
  "src/app/(main)/[meetingCode]",
];

const root = process.cwd();
const stashDir = path.join(root, ".desktop-excluded");

async function listFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
    }),
  );

  return files.flat();
}

async function moveFile(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  await rename(source, destination);
}

async function restoreStashedFiles() {
  for (const stashedFile of await listFiles(stashDir)) {
    const relativePath = path.relative(stashDir, stashedFile);
    const sourcePath = path.join(root, relativePath);

    if (existsSync(sourcePath)) {
      throw new Error(
        `Cannot restore desktop-excluded file because it already exists: ${relativePath}`,
      );
    }

    await moveFile(stashedFile, sourcePath);
  }

  await rm(stashDir, { force: true, recursive: true });
}

// Renaming a directory commonly fails with EPERM on Windows while an editor,
// dev server, or indexer has it open. Moving its files leaves the directory
// handles intact and still prevents Next.js from discovering these routes.
if (existsSync(stashDir)) {
  await restoreStashedFiles();
}

const filesToExclude = (
  await Promise.all(
    EXCLUDED_ROUTES.map((route) => listFiles(path.join(root, route))),
  )
).flat();

try {
  for (const sourcePath of filesToExclude) {
    const relativePath = path.relative(root, sourcePath);
    await moveFile(sourcePath, path.join(stashDir, relativePath));
  }

  const result = spawnSync("pnpm", ["exec", "next", "build"], {
    env: { ...process.env, BUILD_TARGET: "desktop" },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  process.exitCode = result.status ?? 1;
} finally {
  if (existsSync(stashDir)) {
    await restoreStashedFiles();
  }
}
