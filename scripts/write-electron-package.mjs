import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourcePackagePath = path.join(root, "package.json");
const outputDir = path.join(root, "dist-electron");
const outputPackagePath = path.join(outputDir, "package.json");

const sourcePackage = JSON.parse(await readFile(sourcePackagePath, "utf8"));
const electronPackage = {
  name: sourcePackage.name,
  version: sourcePackage.version,
  private: true,
  main: "main.js",
  description: sourcePackage.description ?? "Kallio Meet desktop client",
  author: sourcePackage.author ?? "Kallio",
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPackagePath, `${JSON.stringify(electronPackage, null, 2)}\n`);
