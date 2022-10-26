import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import { format } from './prettier';
export const cwd = path.resolve(process.cwd());
export const buildTools = ['esbuild', 'tsc'];
export const runtimes = ['web', 'node', 'bun'];
export const packageManagers = ['pnpm', 'npm'];
export const moduleTypes = [
    'commonjs',
    'es2015',
    'es2020',
    'es2022',
    'esnext',
    'node16',
    'nodenext'
];
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
];
export const willTranspile = (runtime) => runtime !== 'web';
export function indexHtml(useEsm, title, pathToCss) {
    return format(`<!DOCTYPE html> <html lang="en"> <head>
    <title>${title}</title>
    <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    ` +
        (pathToCss ? ` <link rel="stylesheet" href="${pathToCss}"> ` : '') +
        `<script defer ${useEsm ? `type="module"` : ''} src="/dist/index.js"></script>
  </head> <body> </body> </html>`, 'html');
}
export class FileList {
    constructor() {
        this.add = (...data) => {
            data.forEach(f => {
                if (typeof f == 'string') {
                    this.list[f] = '';
                }
                else if (Array.isArray(f)) {
                    f.forEach(f => {
                        this.list[f.name] = f.contents || '';
                    });
                }
                else {
                    this.list[f.name] = f.contents || '';
                }
            });
            return this;
        };
        this.write = async (root) => {
            for (let i = 0; i < Object.keys(this.list).length; i++) {
                const fileName = Object.keys(this.list)[i];
                await writeFiles(root, { [fileName]: this.list[fileName] });
            }
        };
        this.list = {};
        //
    }
}
export function getAvalibleEsTargets(buildTool, esm) {
    let choices = [
        'es6',
        'es2016',
        'es2017',
        'es2018',
        'es2019',
        'es2020',
        'es2021',
        'es2022',
        'esnext'
    ];
    // TSC Supports older es versions, assuming you don't want esm
    if (buildTool == 'tsc' && !esm) {
        choices = ['es3', 'es5', ...choices];
    }
    return choices;
}
export function getDefaultEsTarget(buildTool, esm) {
    // Fallback to es5
    let str = 'es5';
    if (buildTool == 'esbuild') {
        // Assume somewhat new estarget if using the more modern esbuild.
        str = 'es2021';
    }
    else if (buildTool == 'tsc') {
        if (esm) {
            // Prefer ES6 because it supports ESM, but if you're using TSC, you're
            // probably targeting an old ES version anyway.
            str = 'es6';
        }
    }
    return getAvalibleEsTargets(buildTool, esm).findIndex(a => a == str);
}
/** TODO: Implement this properly. I'm not sure how necessary this function is. */
export function getTargetNodeVersion(esTarget) {
    return 14;
}
/** Determine the best ES Module version for a given ES Target. Useful for Typescript's `module` field. Returns `commonjs` if specified estarget doesn't support esm. */
export function getModuleType(esTarget, runtime) {
    switch (esTarget) {
        case 'es3':
        case 'es5':
            return 'commonjs';
        case 'es6':
        case 'es2016':
        case 'es2017':
        case 'es2018':
        case 'es2019':
            return 'es2015';
        case 'es2020':
        case 'es2021':
            return 'es2020';
        case 'es2022':
            return 'es2022';
        case 'esnext':
            return runtime == 'node' ? 'nodenext' : 'esnext';
        default:
            throw new Error(`Unhandled module type ${esTarget}`);
    }
}
export function infoMsg(msg) {
    console.log();
    console.log(chalk.bold(blueBg(' ts-cli ')), msg);
    console.log();
}
export function warnMsg(msg) {
    console.log();
    console.log(chalk.black.bgYellow(' WARN '), msg);
    console.log();
}
/** gets the Typescript blue as a background color, with
 *
 * @param str - the foreground text
 *
 * Taken from https://github.com/microsoft/TypeScript/blob/16156b1baf26a39ce428423f7106f3ef2b4e98bb/src/executeCommandLine/executeCommandLine.ts#L123
 */
export function blueBg(str) {
    if (process.env.COLORTERM === 'truecolor' ||
        process.env.TERM === 'xterm-256color') {
        return `\x1B[48;5;68m${str}\x1B[39;49m`;
    }
    else {
        return `\x1b[44m${str}\x1B[39;49m`;
    }
}
export function blueFg(str) {
    if (process.env.COLORTERM === 'truecolor' ||
        process.env.TERM === 'xterm-256color') {
        return `\x1B[38;5;68m${str}\x1B[39;49m`;
    }
    else {
        return `\x1b[34m${str}\x1B[39;49m`;
    }
}
export function hardWrap(str, printwidth) {
    const words = str.split(' ');
    let currLen = 0;
    let result = '';
    // Iterate over words in string
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        // Split word if it's too long to fit on one line. Place parts of the
        // word on each line, as much as will fit.
        if (word.length > printwidth) {
            const J = Math.floor(printwidth / word.length);
            for (let j = 0; j < J; j++) {
                result +=
                    '\n' + word.substring(j, Math.min(j + printwidth, word.length));
            }
            currLen = word.length % printwidth;
        }
        // Add word to result string, adding a newline before it if it's too long.
        // Add 1 to the length to account for the space that needs to be placed
        // before the word
        else if (currLen + word.length + 1 > printwidth) {
            result += '\n' + word;
            currLen = word.length;
        }
        // In this case, there is enough space for the word on this line. Just
        // add a space and the word to this line
        else {
            result += ' ' + word;
            currLen += 1 + word.length;
        }
    }
    return result;
}
export async function writeFiles(rootdir, files) {
    Object.keys(files).forEach(async (filePath) => {
        const dir = path.join(rootdir, path.dirname(filePath));
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(rootdir, filePath), files[filePath], 'utf8');
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxJQUFJLE1BQU0sTUFBTSxDQUFBO0FBQ3ZCLE9BQU8sRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUM1QixPQUFPLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDekIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVuQyxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQTtBQUU5QyxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFVLENBQUE7QUFHckQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQVUsQ0FBQTtBQUd2RCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFVLENBQUE7QUFHdkQsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHO0lBQ3pCLFVBQVU7SUFDVixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFVBQVU7Q0FDRixDQUFBO0FBR1YsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHO0lBQ3ZCLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0NBQ0EsQ0FBQTtBQUdWLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxDQUFDLE9BQWlCLEVBQUUsRUFBRSxDQUFDLE9BQU8sS0FBSyxLQUFLLENBQUE7QUFFckUsTUFBTSxVQUFVLFNBQVMsQ0FBQyxNQUFlLEVBQUUsS0FBYSxFQUFF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