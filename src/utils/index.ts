import path from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'
import { format } from './prettier'

export const cwd = path.resolve(process.cwd())

export const buildTools = ['esbuild', 'tsc'] as const
export type BuildTools = typeof buildTools[number]

export const runtimes = ['web', 'node', 'bun'] as const
export type Runtimes = typeof runtimes[number]

export const packageManagers = ['pnpm', 'npm'] as const
export type PackageManagers = typeof packageManagers[number]

export const moduleTypes = [
  'commonjs',
  'es2015',
  'es2020',
  'es2022',
  'esnext',
  'node16',
  'nodenext'
] as const
export type ModuleTypes = typeof moduleTypes[number]

export const esTargets = [
  'es3',
  'es5',
  'es6',
  'es2016',
  'es2017',
  'es2018',
  'es2019',
  'es2020',
  'es2021',
  'es2022',
  'esnext'
] as const
export type ESTargets = typeof esTargets[number]

export const willTranspile = (runtime: Runtimes) => runtime !== 'web'

export function indexHtml(useEsm: boolean, title: string, pathToCss?: string) {
  return format(
    `<!DOCTYPE html> <html lang="en"> <head>
    <title>${title}</title>
    <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    ` +
      (pathToCss ? ` <link rel="stylesheet" href="${pathToCss}"> ` : '') +
      `<script defer ${
        useEsm ? `type="module"` : ''
      } src="/dist/index.js"></script>
  </head> <body> </body> </html>`,
    'html'
  )
}

export type FileDescriptor =
  | string
  | { name: string; contents?: string }
  | { name: string; contents?: string }[]

export class FileList {
  list: { [fileName: string]: string }
  constructor() {
    this.list = {}
    //
  }

  add = (...data: FileDescriptor[]) => {
    data.forEach(f => {
      if (typeof f == 'string') {
        this.list[f] = ''
      } else if (Array.isArray(f)) {
        f.forEach(f => {
          this.list[f.name] = f.contents || ''
        })
      } else {
        this.list[f.name] = f.contents || ''
      }
    })

    return this
  }

  write = async (root: string) => {
    for (let i = 0; i < Object.keys(this.list).length; i++) {
      const fileName = Object.keys(this.list)[i]
      await writeFiles(root, { [fileName]: this.list[fileName] })
    }
  }
}
export function getAvalibleEsTargets(buildTool: BuildTools, esm: boolean) {
  let choices: ESTargets[] = [
    'es6',
    'es2016',
    'es2017',
    'es2018',
    'es2019',
    'es2020',
    'es2021',
    'es2022',
    'esnext'
  ]

  // TSC Supports older es versions, assuming you don't want esm
  if (buildTool == 'tsc' && !esm) {
    choices = ['es3', 'es5', ...choices]
  }

  return choices
}
export function getDefaultEsTarget(
  buildTool: BuildTools,
  esm: boolean
): number {
  // Fallback to es5
  let str: ESTargets = 'es5'
  if (buildTool == 'esbuild') {
    // Assume somewhat new estarget if using the more modern esbuild.
    str = 'es2021'
  } else if (buildTool == 'tsc') {
    if (esm) {
      // Prefer ES6 because it supports ESM, but if you're using TSC, you're
      // probably targeting an old ES version anyway.
      str = 'es6'
    }
  }

  return getAvalibleEsTargets(buildTool, esm).findIndex(a => a == str)
}

/** TODO: Implement this properly. I'm not sure how necessary this function is. */
export function getTargetNodeVersion(esTarget: ESTargets) {
  return 14
}

/** Determine the best ES Module version for a given ES Target. Useful for Typescript's `module` field. Returns `commonjs` if specified estarget doesn't support esm. */
export function getModuleType(
  esTarget: ESTargets,
  runtime: Runtimes
): ModuleTypes {
  switch (esTarget) {
    case 'es3':
    case 'es5':
      return 'commonjs'
    case 'es6':
    case 'es2016':
    case 'es2017':
    case 'es2018':
    case 'es2019':
      return 'es2015'
    case 'es2020':
    case 'es2021':
      return 'es2020'
    case 'es2022':
      return 'es2022'
    case 'esnext':
      return runtime == 'node' ? 'nodenext' : 'esnext'
    default:
      throw new Error(`Unhandled module type ${esTarget}`)
  }
}

export function infoMsg(msg: string) {
  console.log()
  console.log(chalk.bold(blueBg(' ts-cli ')), msg)
  console.log()
}
export function warnMsg(msg: string) {
  console.log()
  console.log(chalk.black.bgYellow(' WARN '), msg)
  console.log()
}

/** gets the Typescript blue as a background color, with
 *
 * @param str - the foreground text
 *
 * Taken from https://github.com/microsoft/TypeScript/blob/16156b1baf26a39ce428423f7106f3ef2b4e98bb/src/executeCommandLine/executeCommandLine.ts#L123
 */
export function blueBg(str: string) {
  if (
    process.env.COLORTERM === 'truecolor' ||
    process.env.TERM === 'xterm-256color'
  ) {
    return `\x1B[48;5;68m${str}\x1B[39;49m`
  } else {
    return `\x1b[44m${str}\x1B[39;49m`
  }
}
export function blueFg(str: string) {
  if (
    process.env.COLORTERM === 'truecolor' ||
    process.env.TERM === 'xterm-256color'
  ) {
    return `\x1B[38;5;68m${str}\x1B[39;49m`
  } else {
    return `\x1b[34m${str}\x1B[39;49m`
  }
}

export function hardWrap(str: string, printwidth: number) {
  const words = str.split(' ')
  let currLen = 0
  let result = ''

  // Iterate over words in string
  for (let i = 0; i < words.length; i++) {
    const word = words[i]

    // Split word if it's too long to fit on one line. Place parts of the
    // word on each line, as much as will fit.
    if (word.length > printwidth) {
      const J = Math.floor(printwidth / word.length)
      for (let j = 0; j < J; j++) {
        result +=
          '\n' + word.substring(j, Math.min(j + printwidth, word.length))
      }
      currLen = word.length % printwidth
    }

    // Add word to result string, adding a newline before it if it's too long.
    // Add 1 to the length to account for the space that needs to be placed
    // before the word
    else if (currLen + word.length + 1 > printwidth) {
      result += '\n' + word
      currLen = word.length
    }

    // In this case, there is enough space for the word on this line. Just
    // add a space and the word to this line
    else {
      result += ' ' + word
      currLen += 1 + word.length
    }
  }

  return result
}

export async function writeFiles(
  rootdir: string,
  files: { [filename: string]: string }
) {
  Object.keys(files).forEach(async filePath => {
    const dir = path.join(rootdir, path.dirname(filePath))
    await fs.mkdir(dir, { recursive: true })

    await fs.writeFile(path.join(rootdir, filePath), files[filePath], 'utf8')
  })
}
