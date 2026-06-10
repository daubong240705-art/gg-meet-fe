import { mkdir, rename, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

// `output: "export"` rejects route handlers and dynamic segments without
// generateStaticParams. These web-only routes are moved aside for the desktop
// build and always restored afterwards, even when the build fails.
const EXCLUDED_ROUTES = [
  "src/app/api",
  "src/app/(main)/[meetingCode]",
];

const root = process.cwd();
const stashDir = path.join(root, ".desktop-excluded");
const stashPath = (route) => path.join(stashDir, route.replaceAll("/", "__"));

const movedRoutes = [];

try {
  await rm(stashDir, { force: true, recursive: true });
  await mkdir(stashDir, { recursive: true });

  for (const route of EXCLUDED_ROUTES) {
    const fullPath = path.join(root, route);

    if (!existsSync(fullPath)) {
      throw new Error(`Expected web-only route is missing: ${route}`);
    }

    await rename(fullPath, stashPath(route));
    movedRoutes.push(route);
  }

  const result = spawnSync("pnpm", ["exec", "next", "build"], {
    env: { ...process.env, BUILD_TARGET: "desktop" },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  process.exitCode = result.status ?? 1;
} finally {
  for (const route of movedRoutes.reverse()) {
    await rename(stashPath(route), path.join(root, route));
  }

  await rm(stashDir, { force: true, recursive: true });
}
