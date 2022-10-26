import chalk from 'chalk'
import { existsSync } from 'fs'
import fs from 'fs/promises'
import inquirer from 'inquirer'
import path from 'path'
import { cwd, warnMsg } from '.'

export default async function getName(existingName?: string) {
  // Ask for a project name if none was provided in argv
  let name =
    existingName ??
    (
      await inquirer.prompt({
        name: 'name',
        message: 'Project name?',
        type: 'input'
      })
    ).name

  // Check if project exists here already

  const targetDir = path.join(cwd, name)
  if (existsSync(targetDir)) {
    warnMsg(chalk.blue(targetDir) + ' already exists.')

    const { decision } = await inquirer.prompt([
      {
        name: 'decision',
        message: 'How to proceed?',
        type: 'list',
        choices: [
          'Append .old to existing path',
          'Remove existing path and continue',
          'Abort'
        ]
      }
    ])

    if (decision.match(/\.old/i)) {
      fs.rename(targetDir, targetDir + '.old')
    } else if (decision.match(/remove/i)) {
      await fs.unlink(targetDir)
    } else {
      // Abort by default to prevent data loss.
      process.exit(1)
    }
  }

  return name
}
