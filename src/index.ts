#!/usr/bin/env node
import { writeFileSync } from 'fs'
import inquirer from 'inquirer'
import path from 'path'
import fs from 'fs'
import url from 'url'
const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

let packageJson: { [key: string]: any } = {
  dependencies: [],
  devDependencies: [],  
}

let files: { [filename: string]: string } = {}

async function main() {
  const type = await getProjectType()
  switch (type) {
    case 'vanilla':
      const packager = await getPackageManager()

      const buildTool = await getBuildTool()
      if (buildTool == 'esbuild') {
        const { config } = await getEsbuildConfig(!!packager.match('yarn'))
        files['build/index.js'] = config
      } else {
        const tsconfig = await getTsconfig(, await getUseESM())
        files['tsconfig.json'] = tsconfig
      }

      return

    default:
      throw new Error(`Unhandled type ${type}`)
  }
}

let esTarget:string


let projectName: string
async function getProjectName() {
  if (projectName == undefined) {
    const { name } = await inquirer.prompt({
      type: 'input',
      name: 'name',
      message: 'Project name?',
    })
    projectName = name
  }
  return projectName
}

async function getTsconfig(esTarget: string, useEsm: boolean, target: 'node' | 'web') {
  const { sourceMapType } = await inquirer.prompt({
    type: 'list',
    default: 'inline',
    name: 'sourceMapType',
    choices: ['separate', 'inline', 'none'],
  })

  let conf: any = {
    compilerOptions: {
      target: esTarget,
      module: useEsm ? 'es6' : 'commonjs',
      strict: true,
      inlineSourceMap: sourceMapType == 'inline' ? true : undefined,
      sourceMap: sourceMapType == 'separate' ? true : undefined,
      outDir: 'dist',
      esModuleInterop: true,
      lib: target == 'web' ? ['dom'] : [],
      moduleResolution: target == 'node' ? 'node' : undefined,
    },
  }

  Object.entries(conf.compilerOptions).forEach(
    ([key, prop]) => prop == undefined && delete conf.compilerOptions[key]
  )

  return conf
}

let buildTool: string
async function getBuildTool() {
  if (buildTool == undefined) {
    const { tool } = await inquirer.prompt({
      type: 'list',
      name: 'tool',
      message: 'Build tool?',
      default: 'esbuild',
      choices: ['tsc', 'esbuild'],
    })
    buildTool = tool
  }
  return buildTool
}

let useEslint: boolean
async function getUseEslint() {
  if (useEslint == undefined) {
    const { eslint } = await inquirer.prompt({
      type: 'confirm',
      name: 'eslint',
      message: 'Use eslint?',
      default: true,
    })

    packageJson.devDependencies.push('eslint')

    useEslint = eslint
  }
  return useEslint
}

let usePrettier: boolean
async function getUsePrettier() {
  if (usePrettier != undefined) {
    const { prettier } = await inquirer.prompt({
      type: 'confirm',
      name: 'prettier',
      message: 'Use prettier?',
      default: true,
    })

    packageJson.prettier = {
      semi: false,
      singleQuote: true,
      useTabs: false,
      tabWidth: 2,
      printWidth: 100,
      arrowParens: 'avoid',
    }

    packageJson.devDependencies.push(
      'prettier',
      'prettier-plugin-organize-imports',
      'prettier-plugin-jsdoc'
    )

    usePrettier = prettier
  }
  return usePrettier
}

let projectType: string
async function getProjectType() {
  if (projectType == undefined) {
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: 'What kind of Typescript project?',
      choices: ['vanilla', 'vue (with vue-cli)'],
    })
    projectType = type
  }
  return projectType
}

let packageManager: string
async function getPackageManager(): Promise<string> {
  if (packageManager == undefined) {
    const { packager } = await inquirer.prompt({
      type: 'list',
      name: 'packager',
      message: 'Pacakge Manager?',
      default: 'npm',
      choices: ['yarn', 'npm'],
    })
    packageManager = packager
  }
  return packageManager
}

let useESM: boolean
async function getUseESM() {
  if (useESM != undefined) return useESM
  const answers = await inquirer.prompt({
    type: 'confirm',
    name: 'esm',
    default: true,
    message: 'Use ESM',
  })
  useESM = answers.esm
  return answers.esm
}

/** Generates a JS file that uses esbuild to build projects. */
async function getEsbuildConfig(useYarn: boolean) {
  type Answer = 'node' | 'broswer' | 'always' | 'dev' | 'prod' | 'never' | 'externals'
  const options: { [key: string]: Answer } = await inquirer.prompt([
    {
      type: 'expand',
      name: 'sourcemap',
      default: 'dev',
      choices: [
        { key: 'y', name: 'always' },
        { key: 'n', name: 'never' },
        { key: 'd', name: 'dev' },
        { key: 'p', name: 'prod' },
      ],
      message: 'Create source map?',
    },
    {
      type: 'expand',
      name: 'minify',
      default: 'prod',
      choices: [
        { key: 'y', name: 'always' },
        { key: 'n', name: 'never' },
        { key: 'd', name: 'dev' },
        { key: 'p', name: 'prod' },
      ],
      message: 'Minify?',
    },
    {
      type: 'expand',
      name: 'bundle',
      default: 'externals',
      choices: [
        { key: 'y', name: 'always' },
        { key: 'n', name: 'never' },
        { key: 'd', name: 'dev' },
        { key: 'p', name: 'prod' },
        { ket: 'e', name: 'externals' },
      ],
      message: 'Bundle?',
    },
    {
      type: 'expand',
      name: 'target',
      default: 'node',
      choices: [
        { name: 'node', key: 'o' },
        { name: 'browser', key: 'w' },
      ],
      message: 'Target?',
    },
  ])

  let devModeCheck = false
  let plugins: { [identifier: string]: string } = {}

  let externalsPlugin = {
    makeAllPackagesExternalPlugin: `let makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}`,
  }
  let yarnPlugin = {
    'pnpPlugin()': `import { pnpPlugin } from '@yarnpkg/esbuild-plugin-pnp'`,
  }

  const choiceParsed = (choice: Answer) => {
    switch (choice) {
      case 'always':
        return 'true'
      case 'dev':
        devModeCheck = true
        return `DEV`
      case 'prod':
        devModeCheck = true
        return `!DEV`
      case 'never':
        return `false`
      case 'externals':
        plugins = { ...plugins, ...externalsPlugin }
        return 'true'
    }
  }
  let config = ''
  if (await getUseESM()) {
    config += `import esbuild from 'esbuild'`
  } else {
    config += `const esbuild = require('esbuild')`
  }

  config += `esbuild.buildSync({
  entryPoints: ['src/index.ts'],
  bundle: ${choiceParsed(options.bundle)},
  minify: ${choiceParsed(options.minify)},${options.target == 'node' ? 'target: node,' : ''}
  sourcemap: ${choiceParsed(options.sourcemap)},${
    plugins
      ? `
  plugins: [
    ${Object.keys(plugins).join(',\n    ')}
  ],`
      : ''
  }
  outfile: 'dist/index.js',
})
`
  if (devModeCheck) {
    config = `const DEV = process.env.node_env == 'development'

${config}`
  }
  if (Object.keys(plugins)) {
    config = `${Object.values(plugins).join(`\n`)}

${config}`
  }

  return { config, options }
}

main()
