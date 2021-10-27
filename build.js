const esbuild = require("esbuild")
const InlineCSSPlugin = require("esbuild-plugin-inline-css")

esbuild.build({
  entryPoints: ["lib/flowx.js"],
  format: "esm",
  bundle: true,
  minify: true,
  plugins: [InlineCSSPlugin()],
  outfile: "dist/flowx.esm.js",
})
