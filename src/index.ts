#!/usr/bin/env node
import chalk from 'chalk'
import path from 'path'
import getName from './utils/getName.js'
import askForArgs from './utils/ask.js'
import useParams from './utils/handleParams.js'
import { cwd, infoMsg, willTranspile } from './utils/index.js'
import { installDeps } from './utils/npm.js'
import Scripts from './utils/scripts.js'
import readme from './utils/readme.js'
import { Params, parsed } from './utils/yargs.js'

main()

async function main() {
  // Initialize ---
  const name = await getName(parsed?.name)
  let params: Params

  if (parsed && 'runtime' in parsed) {
    infoMsg(`Using default arguments for a ${parsed.runtime} runtime:`)
    console.log(parsed)
    params = parsed
  } else {
    params = { name, ...(await askForArgs()) }
  }

  const start = new Date().getTime()
  const gitignore = ['dist/', 'node_modules/']
  const dir = path.join(cwd, name)
  const { packageJson, scripts, files } = useParams(params, name)
  // ---

  // Write files ---
  infoMsg('Creating files...')
  files.add({
    name: willTranspile(params.runtime) ? 'src/index.ts' : 'index.ts',
    contents:
      params.css && params.buildTool == 'esbuild'
        ? `import './style.scss'\n`
        : ''
  })
  files.add({ name: 'package.json', contents: packageJson.toString() })
  files.add({ name: 'README.md', contents: readme(packageJson.data, params) })
  files.add({ name: '.gitignore', contents: gitignore.join('\n') })
  await files.write(dir)
  // ---

  // Install deps ---
  infoMsg(`Installing dependencies with ${params.packageManager}...`)
  await new Scripts(process)
    .addMany(installDeps(params.packageManager, packageJson))
    .exec(dir)
  // ---

  // Post install ---
  infoMsg('Running post install scripts...')
  await scripts.exec(dir)
  // ---

  // Finish message ---
  infoMsg(
    'Done. Created ' +
      chalk.blue(chalk.bold(name)) +
      ' at ' +
      chalk.blue(dir) +
      ` in ${new Date().getTime() - start}ms`
  )
  // ---
}
