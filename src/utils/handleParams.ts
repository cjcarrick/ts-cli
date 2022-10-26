import { FileList, indexHtml, willTranspile } from '.'
import { esbuildLib, esbuildScript } from './esbuild'
import eslint, { eslintNodeDeclarator } from './eslint'
import { bun } from './bun'
import { prettierConfig } from './prettier'
import tsc from './tsc'
import { Params } from './yargs'
import PackageJson from './npm'
import Scripts from './scripts'

export default function handleParams(params: Params, name: string) {
  // Initialize variables that will be added to depending on the params
  const packageJson = new PackageJson(name)
    .extend({ version: '0.1.0' })
    .devDependency('typescript')
  const files = new FileList()
  const scripts = new Scripts(process)

  // For building

  if (willTranspile(params.runtime)) {
    if (params.buildTool == 'esbuild') {
      files.add(esbuildScript(params), ...esbuildLib(params))

      packageJson
        .devDependency('esbuild')
        .devDependency('chalk')
        .script('build', 'export NODE_ENV=production && node util/build.js')
        .script('watch', 'export NODE_ENV=development && node util/build.js -w')
    } else if (params.buildTool == 'tsc') {
      files.add(tsc(params.runtime, params.modules, params.esTarget))

      packageJson
        .script('build', 'export NODE_ENV=production && tsc')
        .script('watch', 'export NODE_ENV=development && tsc -w')
    }
  }

  if (params.modules !== 'commonjs') {
    packageJson.extend({ type: 'module' })
  } else {
    packageJson.extend({ type: 'commonjs' })
  }

  // For running scripts

  if (params.runtime == 'web') {
    // Esbuild has to know that util/build.js will be run in node
    if (params.buildTool == 'esbuild' && willTranspile(params.runtime)) {
      files.add(eslintNodeDeclarator())
    }
    files.add({
      name: 'index.html',
      contents: indexHtml(
        params.modules !== 'commonjs',
        name,
        params.css && params.buildTool == 'tsc' ? 'dist/style.css' : undefined
      )
    })
  } else if (params.runtime == 'node') {
    packageJson.script(
      'start',
      'node ' +
        (params.buildTool == 'tsc'
          ? '--experimental-specifier-resolution=node '
          : '') +
        (params.sourceMap ? '--enable-source-maps ' : '') +
        'dist/index.js'
    )
  } else if (params.runtime == 'bun') {
    packageJson.script('start', 'bun').devDependency('bun-types')

    files.add(...bun())
  }

  // For development

  if (params.devScript) {
    if (params.runtime == 'web') {
      packageJson
        .script('dev', 'live-server --no-browser')
        .devDependency('live-server')
    } else if (params.runtime == 'node') {
      packageJson
        .script('dev', 'nodemon dist/index.js')
        .devDependency('nodemon')
    }
  }

  // Additional features

  if (params.prettier) {
    packageJson
      .extend({
        prettier: {
          ...prettierConfig,
          plugins: [
            './node_modules/prettier-plugin-jsdoc',
            './node_modules/prettier-plugin-organize-imports/index.js'
          ]
        }
      })
      .devDependency('prettier')
      .devDependency('prettier-plugin-jsdoc')
      .devDependency('prettier-plugin-organize-imports')
  }

  if (params.eslint) {
    packageJson
      .devDependency('eslint')
      .devDependency('@typescript-eslint/parser')
      .devDependency('@typescript-eslint/eslint-plugin')
    files.add(eslint(params.runtime))
  }

  if (params.css) {
    if (params.buildTool == 'esbuild') {
      packageJson.devDependency('esbuild-sass-plugin')
      files.add('src/style.scss')
    } else if (params.buildTool == 'tsc') {
      files.add('style.css')
    }
  }

  if (params.git) {
    scripts
      .add('git', 'init')
      .add('git', 'add', '-A')
      .add('git', 'commit', '-m', 'initial commit')
  }

  return { files, packageJson, scripts }
}
