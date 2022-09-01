const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^./]|^.[^./]|^..[^/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}

import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['src/index.ts'],
  watch: process.argv.includes('-w'),
  target: ['es2021'],
  bundle: true,
  format: "esm",
  minify: true,target: 'node',
  sourcemap: 'inline',
  plugins: [
    makeAllPackagesExternalPlugin
  ],
  outdir: 'dist',
})
