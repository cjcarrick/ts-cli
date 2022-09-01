#!/usr/bin/env node
import { execa } from 'execa'
import inquirer from 'inquirer'
import path from 'path'
import { existsSync, promises as fs } from 'fs'
import chalk from 'chalk'
const cwd = path.resolve(process.cwd())

let packageJson: { [key: string]: any } = {
  dependencies: [],
  scripts: {},
  devDependencies: ['typescript']
}
let postInstallScripts: { bin: string; args: string[] }[] = []
let esmSupported: boolean

let files: { [filename: string]: string | any } = {}
let gitignore: string[] = []

function infoMsg(msg: string) {
  console.log()
  console.log(chalk.bgBlue(chalk.bold(' [ts-cli] ')), msg)
  console.log()
}

async function main() {
  const projectTypes = ['Vanilla', 'Vue (with vue-cli)']
  const type = await getProjectType(projectTypes)
  const i = projectTypes.findIndex(a => a == type)

  switch (i) {
    case 0:
      packageJson.name = await getProjectName()

      const packager = await getPackageManager()

      const buildTool = await getBuildTool()
      if (buildTool == 'esbuild') {
        packageJson.devDependencies.push('esbuild')
        const { config } = await getEsbuildConfig((await getModuleType(buildTool)) == 'commonjs' ? 'cjs' : 'esm')
        files['build/index.js'] = config
      } else {
        const tsconfig = await getTsconfig(await getEsTarget(buildTool), await getModuleType(buildTool), await getBuildTarget())
        files['tsconfig.json'] = tsconfig
      }

      await getUseEslint()
      await getUsePrettier()
      await getAddNodemon(await getBuildTarget(), (await getModuleType(buildTool)) != 'commonjs', packageJson.name)

      const start = new Date().getTime()

      infoMsg('Creating files...')

      files['src/index.ts'] = ''
      const projectDir = path.join(cwd, await getProjectName())

      Object.entries(files).forEach(async ([filePath, contents]) => {
        if (typeof contents != 'string') contents = JSON.stringify(contents, null, 2)
        await fs.mkdir(path.join(projectDir, path.dirname(filePath)), { recursive: true })
        await fs.writeFile(path.join(projectDir, filePath), contents, 'utf8')
      })

      infoMsg(`Wrote ${Object.keys(files).length} files to ${projectDir}.`)

      infoMsg('Installing dependencies...')

      const execaOpts = {
        cwd: projectDir,
        stdout: process.stdout,
        stderr: process.stderr
      }

      await fs.writeFile(path.join(projectDir, 'package.json'), '{}', 'utf8')
      if (packager == 'pnpm') {
        if (packageJson.devDependencies.length) {
          await execa('pnpm', ['add', '-D', ...packageJson.devDependencies], execaOpts)
        }
        if (packageJson.dependencies.length) {
          await execa('pnpm', ['add', ...packageJson.dependencies], execaOpts)
        }
      } else if (packager == 'npm') {
        if (packageJson.devDependencies.length) {
          await execa('npm', ['i', '-D', ...packageJson.devDependencies], execaOpts)
        }
        if (packageJson.dependencies.length) {
          await execa('npm', ['i', ...packageJson.dependencies], execaOpts)
        }
      }

      infoMsg('Running post install scripts...')

      postInstallScripts.forEach(async s => await execa(s.bin, s.args, execaOpts))

      // Modify final package.json to add scripts
      let pack = JSON.parse(await fs.readFile(path.join(projectDir, 'package.json'), 'utf8'))
      delete packageJson.dependencies
      delete packageJson.devDependencies
      pack = { ...pack, ...packageJson }
      if (moduleType) pack.type = 'module'
      await fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify(pack, null, 2))

      infoMsg(`Done. Finished in ${new Date().getTime() - start}ms`)

      return

    default:
      throw new Error(`Unhandled type ${type}`)
  }
}

let esTarget: 'es3' | 'es5' | 'es2015' | 'es2016' | 'es2017' | 'es2018' | 'es2019' | 'es2020' | 'es2021' | 'es2022' | 'esnext'
async function getEsTarget(buildTool: 'esbuild' | 'tsc') {
  if (esTarget == undefined) {
    const choices =
      buildTool == 'tsc'
        ? ['es3', 'es5', 'es2015 (es6)', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'es2022', 'esnext']
        : ['es2015 (es6)', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'es2022', 'esnext']

    let { targ } = await inquirer.prompt({
      choices,
      message:
        buildTool == 'tsc' ? 'ES version? (es3 and es5 will not come with support for modules unless building for node.)' : 'ES Version?',
      type: 'list',
      loop: false,
      default: buildTool == 'tsc' ? 'es2015 (es6)' : 'es2021',
      name: 'targ'
    })
    targ = (targ as string).match(/^es(next|[0-9]+)/i)![0]
    esTarget = targ

    // Determine if ES modules are supported based on this
    const ver = parseInt(targ)
    esmSupported = isNaN(ver) || ver > 5
  }
  return esTarget
}

let projectName: string
async function getProjectName() {
  if (projectName == undefined) {
    const { name } = await inquirer.prompt({
      type: 'input',
      name: 'name',
      validate: input => !input.match(/[<>:"\/\\|?*]/i) && !!input.match(/\.?\w+/),
      message: 'Project name?'
    })

    if (existsSync(path.join(cwd, name))) {
      const dir = path.join(cwd, name).replace(process.env.HOME || '', '~')
      const choices = ['Append .old to existing project', 'Overwrite existing project', 'Abort']
      const { decision } = await inquirer.prompt({
        type: 'list',
        name: 'decision',
        message: `${dir} already exists. How to proceed?`,
        choices
      })

      switch (choices.findIndex(a => a == decision)) {
        case 0:
          if (existsSync(path.join(cwd, `${name}.old`))) {
            infoMsg('Could not append .old because there is already a directory by the same name with the same .old extension.')
            process.exit(1)
          }
          await fs.rename(path.join(cwd, name), path.join(cwd, `${name}.old`))
          break
        case 1:
          await fs.rm(path.join(cwd, name), { recursive: true })
          break
        default:
          process.exit(0)
      }
    }
    projectName = name
  }
  return projectName
}

let addNodemon: boolean
async function getAddNodemon(buildTarget: 'web' | 'node', useEsm: boolean, projectName: string) {
  if (addNodemon == undefined) {
    if (buildTarget == 'node') {
      const { choice } = await inquirer.prompt({
        type: 'confirm',
        message: 'Add Nodemon script for development?',
        default: true,
        name: 'choice'
      })
      if (choice) {
        packageJson.scripts['dev'] = 'nodemon dist/index.js'
        packageJson.devDependencies.push('nodemon')
      }
      addNodemon = choice
    } else if (buildTarget == 'web') {
      const { choice } = await inquirer.prompt({
        type: 'confirm',
        message: 'Add live-server script for development?',
        default: true,
        name: 'choice'
      })
      if (choice) {
        files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script defer${useEsm ? ` type="module"` : ''} src="/dist/index.js"></script>
  <title>${projectName}</title>
</head>
<body></body>
</html>
        `
        packageJson.scripts['dev'] = 'live-server --no-browser'
        packageJson.devDependencies.push('live-server')
      }
      addNodemon = choice
    }
  }
  return addNodemon
}

let sourceMapType: string
async function getSourceMapType() {
  if (sourceMapType == undefined) {
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      choices: ['Inline', 'Separate', 'None'],
      message: 'Source map type?'
    })
    sourceMapType = type
  }
  return sourceMapType
}

async function getTsconfig(esTarget: string, moduleType: string, target: 'node' | 'web') {
  const sourceMapType = await getSourceMapType()
  let conf: any = {
    compilerOptions: {
      target: esTarget,
      module: moduleType,
      strict: true,
      inlineSourceMap: sourceMapType.match(/inline/i) ? true : undefined,
      sourceMap: sourceMapType.match(/separate/i) ? true : undefined,
      outDir: 'dist',
      esModuleInterop: true,
      lib: target == 'web' ? ['dom'] : [],
      moduleResolution: target == 'node' ? 'node' : undefined
    }
  }

  Object.entries(conf.compilerOptions).forEach(([key, prop]) => prop == undefined && delete conf.compilerOptions[key])

  return conf
}

let buildTool: 'esbuild' | 'tsc'
async function getBuildTool() {
  if (buildTool == undefined) {
    const { tool } = await inquirer.prompt({
      type: 'list',
      name: 'tool',
      message: 'Build tool?',
      choices: ['esbuild', 'tsc']
    })
    if (tool == 'tsc') {
      packageJson.scripts.build = 'tsc src/index.ts'
      packageJson.scripts.watch = 'tsc -w src/index.ts'
    } else if (tool == 'esbuild') {
      packageJson.scripts.build = 'node build/index.js'
      packageJson.scripts.watch = 'node build/index.js -w'
    }
    gitignore.push('dist/')
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
      default: true
    })

    files['.eslintrc.js'] = ``

    packageJson.devDependencies.push('eslint')
    reccomendedExtension('dbaeumer.vscode-eslint')

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
      default: true
    })

    if (usePrettier) {
      packageJson.prettier = {
        semi: false,
        singleQuote: true,
        useTabs: false,
        tabWidth: 2,
        printWidth: 100,
        arrowParens: 'avoid'
      }

      packageJson.devDependencies.push('prettier', 'prettier-plugin-organize-imports', 'prettier-plugin-jsdoc')
      reccomendedExtension('esbenp.prettier-vscode')
    }

    usePrettier = prettier
  }
  return usePrettier
}

let projectType: string
async function getProjectType(avalibleTypes: string[]) {
  if (projectType == undefined) {
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: 'What kind of Typescript project?',
      choices: avalibleTypes
    })
    projectType = type
  }
  return projectType
}

let editor: string
async function getEditor() {
  if (editor == undefined) {
    const { e } = await inquirer.prompt({
      type: 'list',
      name: 'e',
      message: 'Editor?',
      default: 'vim',
      choices: ['vim', 'vscode', 'unspecified']
    })

    editor = e
  }
  return editor
}

function reccomendedExtension(extensionName: string) {
  const path = '.vscode/extensions.json'
  if (!(path in files)) files[path] = { extensions: [] }
  files[path].extensions.push(extensionName)
}

let packageManager: string
async function getPackageManager(): Promise<string> {
  if (packageManager == undefined) {
    const { packager } = await inquirer.prompt({
      type: 'list',
      name: 'packager',
      message: 'Pacakge Manager?',
      choices: ['pnpm', 'npm']
    })

    packageJson.scripts.start = 'node dist/index.js'
    gitignore.push('node_modules/')
    packageManager = packager
  }
  return packageManager
}

let moduleType: 'commonjs' | 'es2015' | 'es2020' | 'es2022' | 'esnext' | 'node16' | 'nodenext'
async function getModuleType(buildTool: 'esbuild' | 'tsc') {
  const estarg = await getEsTarget(buildTool)
  const targ = await getBuildTarget()

  if (moduleType == undefined) {
    switch (estarg) {
      case 'es3':
      case 'es5':
        moduleType = 'commonjs'
        break
      case 'es2015':
      case 'es2016':
      case 'es2017':
      case 'es2018':
      case 'es2019':
        moduleType = 'es2015'
        break
      case 'es2020':
      case 'es2021':
        moduleType = 'es2020'
        break
      case 'es2022':
        moduleType = 'es2022'
        break
      case 'esnext':
        moduleType = targ == 'node' ? 'nodenext' : 'esnext'
        break
      default:
        throw new Error(`Unhandled module type ${moduleType}`)
    }
  }
  return moduleType
}

let buildTarget: 'node' | 'web'
async function getBuildTarget(): Promise<typeof buildTarget> {
  if (buildTarget == undefined) {
    const { targ } = await inquirer.prompt({
      type: 'list',
      name: 'targ',
      message: 'Build target?',
      choices: ['node', 'web']
    })
    buildTarget = targ
  }
  return buildTarget
}

/** Generates a JS file that uses esbuild to build projects. */
async function getEsbuildConfig(moduleType: 'esm' | 'cjs') {
  const { minify, bundle } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'minify',
      default: true,
      message: 'Minify for production?'
    },
    {
      type: 'list',
      name: 'bundle',
      default: 1,
      choices: ['All', 'Externals only', 'None'],
      message: 'Bundle modules?'
    }
  ])

  let devModeCheck = false
  let plugins: { [identifier: string]: string } = {}

  let externalsPlugin = {
    makeAllPackagesExternalPlugin: `const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}`
  }

  const choiceParsed = (choice: string | boolean) => {
    if (choice == true) {
      return 'true'
    }
    if (choice == false) {
      return 'false'
    }
    if (choice.match(/always|all/i)) {
      return 'true'
    }
    if (choice.match(/external/i)) {
      plugins = { ...plugins, ...externalsPlugin }
      return 'true'
    }
    if (choice.match(/never/i)) {
      return 'false'
    }
    if (choice.match(/prod/i)) {
      devModeCheck = true
      return `!DEV`
    }
    if (choice.match(/dev/i)) {
      devModeCheck = true
      return `DEV`
    }
  }

  let config = ''

  if (esmSupported) {
    config += `import esbuild from 'esbuild'\n\n`
  } else {
    config += `const esbuild = require('esbuild')\n\n`
  }

  const target = await getBuildTarget()
  let sourcemap = await getSourceMapType()

  if (sourcemap.match(/inline/i)) {
    sourcemap = 'inline'
  } else if (sourcemap.match(/separate/i)) {
    sourcemap = 'linked'
  } else {
    sourcemap = ''
  }

  config += `esbuild.build({
  entryPoints: ['src/index.ts'],
  watch: process.argv.includes('-w'),
  target: ['${await getEsTarget('esbuild')}'],
  bundle: ${choiceParsed(bundle)},
  format: "${moduleType}",
  minify: ${choiceParsed(minify)},${target == 'node' ? `target: 'node',` : ''}${
    sourcemap
      ? `
  sourcemap: ${sourcemap == 'linked' ? 'true' : `'inline'`},`
      : ''
  }${
    plugins
      ? `
  plugins: [
    ${Object.keys(plugins).join(',\n    ')}
  ],`
      : ''
  }
  outdir: 'dist',
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

  return { config }
}

main()
