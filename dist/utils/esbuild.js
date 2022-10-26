import { getTargetNodeVersion } from '../utils';
import { format } from './prettier';
import chalk from 'chalk';
export function esbuildScript(params) {
    // If we are using esbuild as a build tool, we are using es modules too.
    // Therefore, package.json will include `type: 'module'` and we can use
    // `import` in this script.
    const esm = params.modules !== 'commonjs';
    let script = '';
    script += esm ? "import esbuild from 'esbuild';" : '';
    script += esm ? "import { handleBuildDone } from './lib.js';" : '';
    script += esm && params.css ? "import { sassPlugin } from 'esbuild-sass-plugin';" : '';
    script += esm ? '' : 'const esbuild = require("esbuild");';
    script += esm ? '' : 'const { handleBuildDone } = require("./lib.js");';
    script += !esm && params.css ? "const { sassPlugin } = require('esbuild-sass-plugin');" : '';
    script += `const DEV = !!process.env.NODE_ENV?.match(/dev/i);`;
    script += `const WATCH = !!process.argv.includes('-w');`;
    script += '\n\n';
    script +=
        `esbuild.build({
    entryPoints: ['src/index.ts'],
    watch: WATCH && { onRebuild: a => handleBuildDone(a) },
    target: [` +
            `"${params.esTarget}",` +
            (params.runtime == 'node'
                ? `"node${getTargetNodeVersion(params.esTarget)}"`
                : '') +
            `],
    bundle: ${params.bundleModules},
    logLevel: 'silent',
    minify: ${params.minify && `!DEV`},
    format: "${esm ? 'esm' : 'cjs'}",${params.css
                ? `plugins: [sassPlugin({ type: 'style', style: 'compressed' })],`
                : ''}
    outdir: 'dist', ${params.sourceMap ? "sourcemap: 'inline'," : ''}}).then(a => handleBuildDone(a))
  .catch(a => handleBuildDone(a))`;
    return { name: 'util/build.js', contents: format(script, 'js') };
}
export function esbuildLib(params) {
    chalk.bgYellow;
    let lib = `
const log = console.log
const pad = num => ''.padStart(num ?? 0)

function padText(str, padding) {
  return str
    .split('\\n')
    .reduce((acc, curr, i) => acc + (i > 0 ? '\\n' : '') + pad(padding) + curr, '')
}

export function hardWrap(str, printwidth) {
  if (!str) return str
  const words = str.split(' ')

  let currLen = 0
  let result = ''
  // Iterate over words in string
  for (let i = 0; i < words.length; i++) {
    const word = words[i]

    // Split word if it's too long to fit on one line. Place parts of the
    // word on each line, as much as will fit.
    if (word.length > printwidth) {
      for (let j = 0; j < Math.floor(printwidth / word.length); j++) {
        result += '\\n' + word.substring(j, Math.min(j + printwidth, word.length))
      }
      currLen = word.length % printwidth
    }

    // Add word to result string, adding a newline before it if it's too long.
    // Add 1 to the length to account for the space that needs to be placed
    // before the word
    else if (currLen + word.length + 1 > printwidth) {
      result += '\\n' + word
      currLen = word.length
    }

    // In this case, there is enough space for the word on this line. Just
    // add a space and the word to this line
    else {
      if (i > 0) {
        result += ' '
      }
      result += word
      currLen += 1 + word.length
    }
  }

  return result
}

const isNarrow = num => (num ?? process.stdout.columns) < 24
const isReallyNarrow = num => (num ?? process.stdout.columns) < 16

function msg(str, level = 'info', title) {
  // Genereate log level badge

  const time = new Date().toLocaleTimeString().match(/^[0-9:]+/)[0]
  let line1 = ''
  const cols = process.stdout.columns

  if (level == 'ok') {
    line1 += chalk.black.bgGreen('  OK  ')
  } else if (level == 'warn') {
    line1 += chalk.black.bgYellow(' WARN ')
  } else if (level == 'error') {
    line1 += chalk.black.bgRed(' ERR  ')
  } else {
    line1 += chalk.black.bgBlue(' INFO ')
  }

  // Print header with title

  title = title || ''
  const width = cols - 1 - time.length - 1 - 6

  if (isNarrow(width)) {
    log(line1 + time.padStart(cols - 6))
    log(
      padText(
        hardWrap(chalk.bold(title), cols - (isReallyNarrow(width) ? 4 : 0)),
        isReallyNarrow(width) ? 0 : 2
      )
    )
    log()
  } else {
    const titleLines = hardWrap(title, width).split('\\n')
    log(line1 + ' ' + chalk.bold(titleLines[0]) + time.padStart(cols - 7 - titleLines[0].length))
    titleLines.splice(0, 1)
    titleLines.forEach(l => log(pad(7) + chalk.bold(l)))
  }
  log()

  // Print body

  if (str) {
    log(padText(hardWrap(str, cols - 4), 2))
  }
}

function printDetail(a) {
  if (!a) return

  // Adjust the line to highlight part if it (if necessary) and add elipses (if
  // necessary)

  const cols = process.stdout.columns
  let lineTxt = a.location.lineText
  let lineTextLength = lineTxt.length
  /** Avalible width for printing lineText */
  const availWidth = cols - 2 - 5 - 2 - 1 - 2
  const { file, line, column, length } = a.location
  let offset = 0
  let trimmedFromLeft = 0

  // Colorize the error, if applicable
  if (length) {
    lineTxt =
      lineTxt.substring(0, column, column) +
      chalk.green(lineTxt.substring(column, column + length)) +
      lineTxt.substring(column + length)

    // subtract chalk's escape codes from the column number
    offset += chalk.green('j').length - 1
  }

  // concatenate line of code that has an error
  if (column > availWidth - 8) {
    // The amount of characters to draw on either side of the highlighted error
    const spacing = (availWidth - 6) / 2
    lineTxt =
      '...' +
      lineTxt.substring(column - Math.floor(spacing), column + offset + Math.ceil(spacing)) +
      '...'
    trimmedFromLeft = column - Math.floor(spacing) - 3
  } else if (lineTextLength > availWidth) {
    lineTxt = lineTxt.substring(0, availWidth - 3 + offset) + '...'
  }

  // Log the preview of the line
  log(\`  \${file}:\${line}:\${column}:\`)
  log(\`  \${line.toString().padStart(5)} │ \${lineTxt}\`)
  log(\`  \${pad(5)} ╵ \${pad(column - trimmedFromLeft)}\${chalk.green('^'.padEnd(length || 1, '^'))}\`)

  // Print suggestion, if any
  if (a.suggestion) {
    log()
    log(a.suggestion)
  }

  // Print notes at the bottom
  if (a.notes && a.notes.length) {
    if (isNarrow()) {
      a.notes.forEach(n => {
        log()
        log(hardWrap(n.text, cols))
      })
    } else {
      a.notes.forEach(n => {
        log()
        log(padText(hardWrap(n.text, cols - 4), 2))
      })
    }
  }

  log()
}

function printError(e) {
  msg('', 'error', e.text)
  printDetail(e)
}
function printWarning(e) {
  msg('', 'warn', e.text)
  printDetail(e)
}

function handleBuildDone(buildStatus, isRebuild = false) {
  console.clear()

  const success = () =>
    msg(
      '',
      'ok',
      \`\${isRebuild ? 'Rebuilt' : 'Built'} src/index.ts with \${
        buildStatus?.warnings?.length || 0
      } warning(s)\`
    )

  if (!buildStatus) {
    success()
    return
  }

  const hasErr = buildStatus.errors && buildStatus.errors.length
  const hasWarn = buildStatus.warnings && buildStatus.warnings.length
  if (hasErr) {
    buildStatus.errors.forEach(e => printError(e))
  }
  if (hasWarn) {
    buildStatus.warnings.forEach(e => printWarning(e))
  }

  if (hasErr) {
    msg(
      '',
      'error',
      (isRebuild ? 'Rebuild' : 'Build') +
        \` of src/index.ts failed with \${buildStatus.errors.length} error(s) and \${buildStatus.warnings.length} warning(s)\`
    )
  } else {
    success()
  }
}
`;
    if (params.modules == 'commonjs') {
        lib =
            "const chalk = require('chalk');\n" +
                lib +
                '\nmodule.exports  ={handleBuildDone}';
    }
    else {
        lib = 'import chalk from "chalk";\n' + lib + '\nexport { handleBuildDone }';
    }
    return [{ name: 'util/lib.js', contents: format(lib, 'js') }];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNidWlsZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9lc2J1aWxkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBa0Isb0JBQW9CLEVBQVksTUFBTSxVQUFVLENBQUE7QUFFekUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNuQyxPQUFPLEtBQUssTUFBTSxPQUFPLENBQUE7QUFFekIsTUFBTSxVQUFVLGFBQWEsQ0FBQyxNQUFjO0lBQzFDLHdFQUF3RTtJQUN4RSx1RUFBdUU7SUFDdkUsMkJBQTJCO0lBRTNCLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxPQUFPLEtBQUssVUFBVSxDQUFBO0lBQ3pDLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQTtJQUNmLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7SUFDckQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsNkNBQTZDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUNsRSxNQUFNLElBQUksR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLG1EQUFtRCxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7SUFDdEYsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQTtJQUMxRCxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGtEQUFrRCxDQUFBO0lBQ3ZFLE1BQU0sSUFBSSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyx3REFBd0QsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO0lBQzVGLE1BQU0sSUFBSSxvREFBb0QsQ0FBQTtJQUM5RCxNQUFNLElBQUksOENBQThDLENBQUE7SUFDeEQsTUFBTSxJQUFJLE1BQU0sQ0FBQTtJQUNoQixNQUFNO1FBQ0o7OztjQUdVO1lBQ1YsSUFBSSxNQUFNLENBQUMsUUFBUSxJQUFJO1lBQ3ZCLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNO2dCQUN2QixDQUFDLENBQUMsUUFBUSxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUc7Z0JBQ2xELENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDUDtjQUNVLE1BQU0sQ0FBQyxhQUFhOztjQUVwQixNQUFNLENBQUMsTUFBTSxJQUFJLE1BQU07ZUFDdEIsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FDNUIsTUFBTSxDQUFDLEdBQUc7Z0JBQ1IsQ0FBQyxDQUFDLGdFQUFnRTtnQkFDbEUsQ0FBQyxDQUFDLEVBQ047c0JBRUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQzlDO2tDQUM4QixDQUFBO0lBRWhDLE9BQU8sRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUE7QUFDbEUsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsTUFBYztJQUN2QyxLQUFLLENBQUMsUUFBUSxDQUFBO0lBQ2QsSUFBSSxHQUFHLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FzTlgsQ0FBQTtJQUVDLElBQUksTUFBTSxDQUFDLE9BQU8sSUFBSSxVQUFVLEVBQUU7UUFDaEMsR0FBRztZQUNELG1DQUFtQztnQkFDbkMsR0FBRztnQkFDSCxzQ0FBc0MsQ0FBQTtLQUN6QztTQUFNO1FBQ0wsR0FBRyxHQUFHLDhCQUE4QixHQUFHLEdBQUcsR0FBRyw4QkFBOEIsQ0FBQTtLQUM1RTtJQUVELE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0FBQy9ELENBQUMifQ==