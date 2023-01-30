import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import { format } from './prettier.js';
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
export const willTranspile = (runtime) => runtime !== 'bun';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxJQUFJLE1BQU0sTUFBTSxDQUFBO0FBQ3ZCLE9BQU8sRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUM1QixPQUFPLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDekIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUV0QyxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQTtBQUU5QyxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFVLENBQUE7QUFHckQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQVUsQ0FBQTtBQUd2RCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFVLENBQUE7QUFHdkQsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHO0lBQ3pCLFVBQVU7SUFDVixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFVBQVU7Q0FDRixDQUFBO0FBR1YsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHO0lBQ3ZCLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0NBQ0EsQ0FBQTtBQUdWLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxDQUFDLE9BQWlCLEVBQUUsRUFBRSxDQUFDLE9BQU8sS0FBSyxLQUFLLENBQUE7QUFFckUsTUFBTSxVQUFVLFNBQVMsQ0FBQyxNQUFlLEVBQUUsS0FBYSxFQUFF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