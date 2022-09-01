# `ts-cli`

Quickly scaffold typescript projects.

### Features

- Builds for Node or web, with or without ES Modules.
- Asks lots of questions to accurately configure build tools, but does so only as necessary.
- Supports `[esbuild](https://esbuild.github.io/)`, which is much faster than `tsc` and can minify and bundle code on its own.
  - You can still use `tsc` if you want, but keep in mind this means you won't be able to bundle or minify your code out of the box.
- Uses `pnpm` for much faster dependency installation and smaller `node_modules`
  - You can still use `npm` if you want.

### Todo:

- [ ] handoff to vue-cli
