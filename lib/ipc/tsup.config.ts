import { defineConfig } from "tsup";
import * as fs from "node:fs";
import * as path from "node:path";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
    };
  },
  dts: true,
  splitting: false,
  clean: true,
  esbuildPlugins: [
    {
      name: "raw-import",
      setup(build) {
        // Handle ?raw imports
        build.onResolve({ filter: /\?raw$/ }, (args) => {
          const filePath = args.path.replace(/\?raw$/, "");
          const resolvedPath = path.resolve(args.resolveDir, filePath);
          return {
            path: resolvedPath,
            namespace: "raw-loader",
          };
        });

        build.onLoad({ filter: /.*/, namespace: "raw-loader" }, (args) => {
          const contents = fs.readFileSync(args.path, "utf-8");
          return {
            contents: `export default ${JSON.stringify(contents)};`,
            loader: "js",
          };
        });
      },
    },
  ],
});
