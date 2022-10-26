import inquirer from 'inquirer'
import {
  runtimes,
  buildTools,
  getAvalibleEsTargets,
  getModuleType,
  packageManagers
} from '.'
import { Params } from './yargs'

export default async function Ask(): Promise<Omit<Params, 'name'>> {
  const {
    runtime,
    esTarget,
    packageManager,
    bundleModules,
    minify,

    prettier,
    eslint,
    css,
    buildTool,
    devScript,
    git,
    sourceMap
  } = await inquirer.prompt([
    {
      name: 'runtime',
      message: 'Runtime?',
      type: 'list',
      loop: false,
      choices: runtimes
    },
    {
      name: 'packageManager',
      message: 'Package manager?',
      type: 'list',
      loop: false,
      choices: packageManagers,
      when: a => a.runTime !== 'bun'
    },
    {
      name: 'buildTool',
      message: 'Build tool?',
      type: 'list',
      loop: false,
      choices: buildTools,
      when: a => a.runTime !== 'bun'
    },
    {
      name: 'bundleModules',
      message: 'Bundle modules?',
      type: 'confirm',
      when: a => a.buildTool == 'esbuild'
    },
    {
      name: 'minify',
      message: 'Minify final JavaScript?',
      type: 'confirm',
      when: a => a.buildTool == 'esbuild'
    },
    {
      name: 'esTarget',
      message: 'ES Target?',
      type: 'list',
      loop: false,
      choices: a => getAvalibleEsTargets(a.buildTool, a.esm).reverse(),
      when: a =>
        a.runtime !== 'bun' &&
        getAvalibleEsTargets(a.buildTool, a.esm).length > 1
    },
    {
      name: 'esm',
      message: 'Use ESM modules?',
      type: 'confirm',
      // Only ask to use ESM when building with TSC when the ES Target supports
      // it. ESBuild only does ESM.
      when: a =>
        a.buildTool == 'tsc' &&
        getModuleType(a.esTarget, a.runtime) !== 'commonjs'
    },
    {
      name: 'css',
      type: 'confirm',
      message: a => (a.buildTool == 'tsc' ? 'Add CSS?' : 'Add SCSS?'),
      when: a => a.runtime == 'web'
    },
    {
      name: 'devScript',
      type: 'confirm',
      message: a =>
        a.runtime == 'node'
          ? 'Add Nodemon for development?'
          : a.runtime == 'bun'
          ? 'Add script for development?'
          : 'Add live-server for development?'
    },
    {
      name: 'sourceMap',
      message: 'Generate source maps?',
      type: 'confirm',
      when: a => a.runTime !== 'bun'
    },
    {
      name: 'prettier',
      message: 'Use Prettier?',
      type: 'confirm'
    },
    {
      name: 'eslint',
      message: 'Use ESLint?',
      type: 'confirm'
    },
    {
      name: 'git',
      type: 'confirm',
      message: 'Initialize Git repository?'
    }
  ])

  return {
    runtime,
    esTarget,
    modules: getModuleType(esTarget, runtime),
    packageManager,
    bundleModules,
    minify,

    prettier,
    eslint,
    css,
    buildTool,
    devScript,
    git,
    sourceMap
  }
}
