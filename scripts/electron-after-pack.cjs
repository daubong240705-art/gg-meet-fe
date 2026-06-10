const { cp, mkdir, rm, stat } = require("node:fs/promises");
const path = require("node:path");

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function removeDirectory(directory) {
  await rm(directory, {
    force: true,
    maxRetries: 5,
    recursive: true,
    retryDelay: 200,
  });
}

module.exports = async function afterPack(context) {
  const resourcesDir = path.join(context.appOutDir, "resources");
  const appNodeModules = path.join(resourcesDir, "app", "node_modules");
  const sourceNodeModules = path.join(context.packager.projectDir, ".next", "standalone", "node_modules");
  const targetNodeModules = path.join(resourcesDir, "standalone", "node_modules");

  await removeDirectory(appNodeModules);

  if (!(await exists(sourceNodeModules))) {
    throw new Error("Missing .next/standalone/node_modules. Run `pnpm run build:standalone` before packaging.");
  }

  await removeDirectory(targetNodeModules);
  await mkdir(path.dirname(targetNodeModules), { recursive: true });
  // Next's standalone output can contain pnpm junctions that point back to the
  // workspace. Materialize them so the packaged app is self-contained and the
  // copy does not require Windows symlink privileges.
  await cp(sourceNodeModules, targetNodeModules, {
    recursive: true,
    dereference: true,
  });
};
