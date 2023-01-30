import { FileList, indexHtml, willTranspile } from './index.js';
import { esbuildLib, esbuildScript } from './esbuild.js';
import eslint, { eslintNodeDeclarator } from './eslint.js';
import { bun } from './bun.js';
import { prettierConfig } from './prettier.js';
import tsc from './tsc.js';
import PackageJson from './npm.js';
import Scripts from './scripts.js';
export default function handleParams(params, name) {
    // Initialize variables that will be added to depending on the params
    const packageJson = new PackageJson(name)
        .extend({ version: '0.1.0' })
        .devDependency('typescript');
    const files = new FileList();
    const scripts = new Scripts(process);
    // For building
    if (willTranspile(params.runtime)) {
        if (params.buildTool == 'esbuild') {
            files.add(esbuildScript(params), ...esbuildLib(params));
            packageJson
                .devDependency('esbuild')
                .devDependency('chalk')
                .script('build', 'export NODE_ENV=production && node util/build.js')
                .script('watch', 'export NODE_ENV=development && node util/build.js -w');
        }
        else if (params.buildTool == 'tsc') {
            files.add(tsc(params.runtime, params.modules, params.esTarget));
            packageJson
                .script('build', 'export NODE_ENV=production && tsc')
                .script('watch', 'export NODE_ENV=development && tsc -w');
        }
    }
    if (params.modules !== 'commonjs') {
        packageJson.extend({ type: 'module' });
    }
    else {
        packageJson.extend({ type: 'commonjs' });
    }
    // For running scripts
    if (params.runtime == 'web') {
        // Esbuild has to know that util/build.js will be run in node
        if (params.buildTool == 'esbuild' && willTranspile(params.runtime)) {
            files.add(eslintNodeDeclarator());
        }
        files.add({
            name: 'index.html',
            contents: indexHtml(params.modules !== 'commonjs', name, params.css && params.buildTool == 'tsc' ? 'dist/style.css' : undefined)
        });
    }
    else if (params.runtime == 'node') {
        packageJson.script('start', 'node ' +
            (params.buildTool == 'tsc'
                ? '--experimental-specifier-resolution=node '
                : '') +
            (params.sourceMap ? '--enable-source-maps ' : '') +
            'dist/index.js');
    }
    else if (params.runtime == 'bun') {
        packageJson.script('start', 'bun').devDependency('bun-types');
        files.add(...bun());
    }
    // For development
    if (params.devScript) {
        if (params.runtime == 'web') {
            packageJson
                .script('dev', 'live-server --no-browser')
                .devDependency('live-server');
        }
        else if (params.runtime == 'node') {
            packageJson
                .script('dev', 'nodemon dist/index.js')
                .devDependency('nodemon');
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
            .devDependency('prettier-plugin-organize-imports');
    }
    if (params.eslint) {
        packageJson
            .devDependency('eslint')
            .devDependency('@typescript-eslint/parser')
            .devDependency('@typescript-eslint/eslint-plugin');
        files.add(eslint(params.runtime));
    }
    if (params.css) {
        if (params.buildTool == 'esbuild') {
            packageJson.devDependency('esbuild-sass-plugin');
            files.add('src/style.scss');
        }
        else if (params.buildTool == 'tsc') {
            files.add('style.css');
        }
    }
    if (params.git) {
        scripts
            .add('git', 'init')
            .add('git', 'add', '-A')
            .add('git', 'commit', '-m', 'initial commit');
    }
    return { files, packageJson, scripts };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlUGFyYW1zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2hhbmRsZVBhcmFtcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDeEQsT0FBTyxNQUFNLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBQzlCLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDOUMsT0FBTyxHQUFHLE1BQU0sVUFBVSxDQUFBO0FBRTFCLE9BQU8sV0FBVyxNQUFNLFVBQVUsQ0FBQTtBQUNsQyxPQUFPLE9BQU8sTUFBTSxjQUFjLENBQUE7QUFFbEMsTUFBTSxDQUFDLE9BQU8sVUFBVSxZQUFZLENBQUMsTUFBYyxFQUFFLElBQVk7SUFDL0QscUVBQXFFO0lBQ3JFLE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQztTQUN0QyxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7U0FDNUIsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzlCLE1BQU0sS0FBSyxHQUFHLElBQUksUUFBUSxFQUFFLENBQUE7SUFDNUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7SUFFcEMsZUFBZTtJQUVmLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNqQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLElBQUksU0FBUyxFQUFFO1lBQ2pDLEtBQUssQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsVUFBVSxD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