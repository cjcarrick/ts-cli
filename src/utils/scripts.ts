import commandExists from 'command-exists'
import { execa, Options } from 'execa'
import chalk from 'chalk'
import { warnMsg } from '../utils/index.js'
import process from 'process'

export type Command = { bin: string; args?: string[] }

export const cmdExists = (bin: string) =>
  new Promise(resolve => commandExists(bin, (err, exists) => resolve(exists)))

export default class Scripts {
  stack: Command[]

  constructor(private proc: typeof process) {
    this.stack = []
  }

  add = (bin: string, ...args: string[]) => {
    this.stack.push({ bin, args: Array.from(args) })
    return this
  }
  addMany = (scripts: { bin: string; args: string[] }[]) => {
    scripts.forEach(s => this.add(s.bin, ...s.args))
    return this
  }

  exec = async (cwd: string) => {
    const opts: Options<string> = {
      stdout: this.proc.stdout,
      stdin: this.proc.stdin,
      cwd
    }

    for (let i = 0; i < this.stack.length; i++) {
      const { bin, args } = this.stack[i]

      if (await cmdExists(bin)) {
        await execa(bin, args, opts)
      } else {
        warnMsg(
          chalk.blue(bin + (args ? ' ' + args.join(' ') : '')) +
            ' failed. Command ' +
            chalk.bold(chalk.blue(bin)) +
            ' does not exist.'
        )
      }
    }

    return
  }
}
