# `ts-cli`

Quickly scaffold typescript projects.

If you don't know how to get started with Typescript or Node, or you just want
to build a simple project, look no further.

## Invocation

```sh
pnpm dlx @cjcarrick/ts-cli [name]
# or
pnpm dlx @cjcarrick/ts-cli <runtime> [preset] [overrides] <name>
```

or

```sh
npx @cjcarrick/ts-cli [name]
# or
npx @cjcarrick/ts-cli <runtime> [preset] [overrides] <name>
```

Can be run interactively with prompts by specifying only a `name` at invocation,
or flags and args can be passed at invocation to skip the prompts (see below).

```
Usage:
  ts-cli [name]
  ts-cli <runtime> [preset] [overrides] <name>

Positionals:
  name  The name of the new project to create                           [string]

Presets
  -0, --barebones  Disables as many things as possible. Default settings enable
                   most things.                                        [boolean]

Overrides
      --[no-]dev-script  Whether or not to add a dev script (using live-server o
                         r Nodemon)                                    [boolean]
      --[no-]eslint      Whether or not to use ESLint                  [boolean]
      --[no-]git         Whether or not to use Git                     [boolean]
      --[no-]prettier    Whether or not to use Prettier                [boolean]
      --[no-]source-map  Whether or not to generate source maps        [boolean]
      --[no-]css         Whether or not to include CSS files when targeting web.
                          Note that TSC will use vanilla CSS, and ESBuild will u
                         se SASS.                                      [boolean]
      --[no-]minify      Whether or not to minify transpiled JavaScript[boolean]
      --[no-]bundle      Whether or not to bundle modules (ESBuild only)
                                                                       [boolean]
      --[no-]esm         Whether or not to use ESM modules             [boolean]
      --pnpm             Use pnpm as package manager                   [boolean]
      --npm              Use npm as package manager                    [boolean]

Options:
      --help       Show help                                           [boolean]
      --version    Show version number                                 [boolean]
  -r, --runtime    What to transpile TypeScript to be able to run in
                                                 [choices: "web", "node", "bun"]
  -b, --builtTool  What to build TypeScript with.

```
### Features

- Builds for Node, Bun, or web, with or without ES Modules.
- Asks lots of questions to accurately configure build tools, but does so only as necessary.
- Supports `[esbuild](https://esbuild.github.io/)`, which is much faster than `tsc` and can minify and bundle code on its own.
  - You can still use `tsc` if you want, but keep in mind this means you won't be able to bundle or minify your code out of the box.
- Uses `pnpm` for much faster dependency installation and smaller `node_modules`
  - You can still use `npm` if you want.

### Todo:

- -[ ] handoff to vue-cli- _Just use vue-cli instead._
- [x] More codesplitting at index.ts
- [ ] add `swc`
