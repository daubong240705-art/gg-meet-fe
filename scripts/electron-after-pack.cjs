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

module.exports = async function afterPack(context) {
  const resourcesDir = path.join(context.appOutDir, "resources");
  const appNodeModules = path.join(resourcesDir, "app", "node_modules");
  const sourceNodeModules = path.join(context.packager.projectDir, ".next", "standalone", "node_modules");
  const targetNodeModules = path.join(resourcesDir, "standalone", "node_modules");

  await rm(appNodeModules, { force: true, recursive: true });

  if (!(await exists(sourceNodeModules))) {
    throw new Error("Missing .next/standalone/node_modules. Run `pnpm run build:standalone` before packaging.");
  }

  await rm(targetNodeModules, { force: true, recursive: true });
  await mkdir(path.dirname(targetNodeModules), { recursive: true });
  await cp(sourceNodeModules, targetNodeModules, { recursive: true });
};
