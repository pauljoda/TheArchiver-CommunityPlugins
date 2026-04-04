const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["view/src/index.ts"],
    bundle: true,
    outfile: "view/index.js",
    format: "iife",
    target: "es2020",
    minify: process.argv.includes("--minify"),
    sourcemap: false,
  })
  .then(() => console.log("View bundle built: view/index.js"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
