import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {
  Runtimes,
  BuildTools,
  ESTargets,
  ModuleTypes,
  PackageManagers,
  runtimes,
  buildTools,
  getModuleType
} from './index.js'

export type Params = {
  name: string
  runtime: Runtimes
  esTarget: ESTargets
  modules: ModuleTypes
  packageManager: PackageManagers

  prettier: boolean
  eslint: boolean
  css: boolean
  buildTool: BuildTools
  devScript: boolean
  bundleModules: boolean
  minify: boolean
  git: boolean
  sourceMap: boolean
}

let args = yargs(hideBin(process.argv))
  .usage(
    'Usage:\n' +
      '  ts-cli [name]\n' +
      '  ts-cli --runtime=<runtime> [preset] [overrides] <name>'
  )

  .positional('name', {
    desc: 'The name of the new project to create',
    type: 'string'
  })

  .option('runtime', {
    alias: 'r',
    desc: 'What to transpile TypeScript to be able to run in',
    choices: runtimes
  })
  .check(args => {
    if (!args._.length && args.runtime) {
      return new Error('Must specify name when specifying runtime.')
    }
    return true
  })

  .option('builtTool', {
    alias: 'b',
    desc: 'What to build TypeScript with.',
    chioces: buildTools
  })

  // Build presets
  .option('barebones', {
    alias: '0',
    desc: 'Disables as many things as possible. Default settings enable most things.',
    group: 'Presets',
    type: 'boolean'
  })

  // Overrides
  .option('[no-]dev-script', {
    desc: 'Whether or not to add a dev script (using live-server or Nodemon)',
    type: 'boolean',
    group: 'Overrides'
  })
  .option('[no-]eslint', {
    desc: 'Whether or not to use ESLint',
    type: 'boolean',
    group: 'Overrides'
  })
  .option('[no-]git', {
    desc: 'Whether or not to use Git',
    type: 'boolean',
    group: 'Overrides'
  })
  .option('[no-]prettier', {
    desc: 'Whether or not to use Prettier',
    type: 'boolean',
    group: 'Overrides'
  })
  .option('[no-]source-map', {
    desc: 'Whether or not to generate source maps',
    type: 'boolean',
    group: 'Overrides'
  })
  .option('[no-]css', {
    // Is this implementation ok? It seems like what people would want most of
    // the time but it takes choice away from the user. I didn't want to focus
    // too much on the CSS side of things for ts-cli.
    desc: 'Whether or not to include CSS files when targeting web. Note that TSC will use vanilla CSS, and ESBuild will use SASS.',
    type: 'boolean',
    group: 'Overrides'
  })
  .option('[no-]minify', {
    desc: 'Whether or not to minify transpiled JavaScript',
    type: 'boolean',
    group: 'Overrides'
  })
  .option('[no-]bundle', {
    desc: 'Whether or not to bundle modules (ESBuild only)',
    type: 'boolean',
    group: 'Overrides'
  })
  .option('[no-]esm', {
    desc: 'Whether or not to use ESM modules',
    type: 'boolean',
    group: 'Overrides'
  })
  .option('pnpm', {
    desc: 'Use pnpm as package manager',
    type: 'boolean',
    group: 'Overrides',
    conflicts: ['npm']
  })
  .option('npm', {
    desc: 'Use npm as package manager',
    type: 'boolean',
    group: 'Overrides',
    conflicts: ['pnpm']
  })

  .parseSync()

export { args as argv }
export type ArgvArgs = typeof args

// Fill defaults

let parsed: undefined | Params | { name: string } = undefined

if (args._[0]) {
  parsed = { name: args._[0] as string }
}

if (args.runtime) {
  const defaultEsTarget = 'es2021'

  const defaults: Params = {
    name: (args._[0] as string) ?? '',
    esTarget: defaultEsTarget,
    modules: getModuleType(defaultEsTarget, args.runtime),
    runtime: args.runtime,
    buildTool: 'esbuild',
    bundleModules: true,
    minify: true,
    sourceMap: true,
    packageManager: 'pnpm',
    prettier: true,
    eslint: true,
    css: true,
    devScript: true,
    git: true
  }

  parsed = Object.entries(defaults).reduce(
    (acc, curr) => ({
      ...acc,
      [curr[0]]: args[curr[0]] ?? curr[1]
    }),
    {}
  ) as Params

  if (args.barebones) {
    parsed = {
      ...parsed,
      prettier: false,
      eslint: false,
      css: false,
      devScript: false,
      git: false,
      sourceMap: false
    }
  }
}

export { parsed }
