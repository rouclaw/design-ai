import { mkdirSync, writeFileSync } from "node:fs";
import * as esbuild from "esbuild";
import { glob } from "glob";

const watch = process.argv.includes("--watch");

// Find all TypeScript files
const entryPoints = await glob("src/**/*.ts");

const commonConfig = {
  entryPoints,
  bundle: false,
  outbase: "src", // Preserve directory structure
  platform: "node",
  target: "node20",
  sourcemap: true,
  packages: "external", // Don't bundle dependencies
};

// Build CommonJS format
const cjsConfig = {
  ...commonConfig,
  outdir: "dist/cjs",
  format: "cjs",
};

// Build ESM format
const esmConfig = {
  ...commonConfig,
  outdir: "dist/esm",
  format: "esm",
};

// Create package.json files to mark the format
function createPackageJsonFiles() {
  mkdirSync("dist/cjs", { recursive: true });
  mkdirSync("dist/esm", { recursive: true });
  writeFileSync(
    "dist/cjs/package.json",
    JSON.stringify({ type: "commonjs" }, null, 2),
  );
  writeFileSync(
    "dist/esm/package.json",
    JSON.stringify({ type: "module" }, null, 2),
  );
}

if (watch) {
  const cjsCtx = await esbuild.context(cjsConfig);
  const esmCtx = await esbuild.context(esmConfig);
  await Promise.all([cjsCtx.watch(), esmCtx.watch()]);
  createPackageJsonFiles();
  console.log("Watching for changes...");
} else {
  await Promise.all([esbuild.build(cjsConfig), esbuild.build(esmConfig)]);
  createPackageJsonFiles();
  console.log("Build complete");
}
