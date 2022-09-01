#!/usr/bin/env node
import { execa } from 'execa';
import inquirer from 'inquirer';
import path from 'path';
import { existsSync, promises as fs } from 'fs';
import url from 'url';
import chalk from 'chalk';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
let packageJson = {
    dependencies: [],
    scripts: {},
    devDependencies: ['typescript']
};
let postInstallScripts = [];
let esmSupported;
let files = {};
let gitignore = [];
function infoMsg(msg) {
    console.log();
    console.log(chalk.bgBlue(chalk.bold(' [ts-cli] ')), msg);
    console.log();
}
async function main() {
    const projectTypes = ['Vanilla', 'Vue (with vue-cli)'];
    const type = await getProjectType(projectTypes);
    const i = projectTypes.findIndex(a => a == type);
    switch (i) {
        case 0:
            packageJson.name = await getProjectName();
            const packager = await getPackageManager();
            const buildTool = await getBuildTool();
            if (buildTool == 'esbuild') {
                packageJson.devDependencies.push('esbuild');
                const { config } = await getEsbuildConfig((await getModuleType(buildTool)) == 'commonjs' ? 'cjs' : 'esm');
                files['build/index.js'] = config;
            }
            else {
                const tsconfig = await getTsconfig(await getEsTarget(buildTool), await getModuleType(buildTool), await getBuildTarget());
                files['tsconfig.json'] = tsconfig;
            }
            await getUseEslint();
            await getUsePrettier();
            await getAddNodemon(await getBuildTarget(), (await getModuleType(buildTool)) != 'commonjs', packageJson.name);
            const start = new Date().getTime();
            infoMsg('Creating files...');
            files['src/index.ts'] = '';
            const projectDir = path.join(__dirname, await getProjectName());
            Object.entries(files).forEach(async ([filePath, contents]) => {
                if (typeof contents != 'string')
                    contents = JSON.stringify(contents, null, 2);
                await fs.mkdir(path.join(projectDir, path.dirname(filePath)), { recursive: true });
                await fs.writeFile(path.join(projectDir, filePath), contents, 'utf8');
            });
            infoMsg('Installing dependencies...');
            const execaOpts = {
                cwd: projectDir,
                stdout: process.stdout,
                stderr: process.stderr
            };
            await fs.writeFile(path.join(projectDir, 'package.json'), '{}', 'utf8');
            if (packager == 'pnpm') {
                if (packageJson.devDependencies.length) {
                    await execa('pnpm', ['add', '-D', ...packageJson.devDependencies], execaOpts);
                }
                if (packageJson.dependencies.length) {
                    await execa('pnpm', ['add', ...packageJson.dependencies], execaOpts);
                }
            }
            else if (packager == 'npm') {
                if (packageJson.devDependencies.length) {
                    await execa('npm', ['i', '-D', ...packageJson.devDependencies], execaOpts);
                }
                if (packageJson.dependencies.length) {
                    await execa('npm', ['i', ...packageJson.dependencies], execaOpts);
                }
            }
            infoMsg('Running post install scripts...');
            postInstallScripts.forEach(async (s) => await execa(s.bin, s.args, execaOpts));
            // Modify final package.json to add scripts
            let pack = JSON.parse(await fs.readFile(path.join(projectDir, 'package.json'), 'utf8'));
            delete packageJson.dependencies;
            delete packageJson.devDependencies;
            pack = { ...pack, ...packageJson };
            if (moduleType)
                pack.type = 'module';
            await fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify(pack, null, 2));
            infoMsg(`Done. Finished in ${new Date().getTime() - start}ms`);
            return;
        default:
            throw new Error(`Unhandled type ${type}`);
    }
}
let esTarget;
async function getEsTarget(buildTool) {
    if (esTarget == undefined) {
        const choices = buildTool == 'tsc'
            ? ['es3', 'es5', 'es2015 (es6)', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'es2022', 'esnext']
            : ['es2015 (es6)', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'es2022', 'esnext'];
        let { targ } = await inquirer.prompt({
            choices,
            message: buildTool == 'tsc' ? 'ES version? (es3 and es5 will not come with support for modules unless building for node.)' : 'ES Version?',
            type: 'list',
            loop: false,
            default: buildTool == 'tsc' ? 'es2015 (es6)' : 'es2021',
            name: 'targ'
        });
        targ = targ.match(/^es(next|[0-9]+)/i)[0];
        esTarget = targ;
        // Determine if ES modules are supported based on this
        const ver = parseInt(targ);
        esmSupported = isNaN(ver) || ver > 5;
    }
    return esTarget;
}
let projectName;
async function getProjectName() {
    if (projectName == undefined) {
        const { name } = await inquirer.prompt({
            type: 'input',
            name: 'name',
            validate: input => !input.match(/[<>:"\/\\|?*]/i) && !!input.match(/\.?\w+/),
            message: 'Project name?'
        });
        if (existsSync(path.join(__dirname, name))) {
            const dir = path.join(__dirname, name).replace(process.env.HOME || '', '~');
            const choices = ['Append .old to existing project', 'Overwrite existing project', 'Abort'];
            const { decision } = await inquirer.prompt({
                type: 'list',
                name: 'decision',
                message: `${dir} already exists. How to proceed?`,
                choices
            });
            switch (choices.findIndex(a => a == decision)) {
                case 0:
                    if (existsSync(path.join(__dirname, `${name}.old`))) {
                        infoMsg('Could not append .old because there is already a directory by the same name with the same .old extension.');
                        process.exit(1);
                    }
                    await fs.rename(path.join(__dirname, name), path.join(__dirname, `${name}.old`));
                    break;
                case 1:
                    await fs.rm(path.join(__dirname, name), { recursive: true });
                    break;
                default:
                    process.exit(0);
            }
        }
        projectName = name;
    }
    return projectName;
}
let addNodemon;
async function getAddNodemon(buildTarget, useEsm, projectName) {
    if (addNodemon == undefined) {
        if (buildTarget == 'node') {
            const { choice } = await inquirer.prompt({
                type: 'confirm',
                message: 'Add Nodemon script for development?',
                default: true,
                name: 'choice'
            });
            if (choice) {
                packageJson.scripts['dev'] = 'nodemon dist/index.js';
                packageJson.devDependencies.push('nodemon');
            }
            addNodemon = choice;
        }
        else if (buildTarget == 'web') {
            const { choice } = await inquirer.prompt({
                type: 'confirm',
                message: 'Add live-server script for development?',
                default: true,
                name: 'choice'
            });
            if (choice) {
                files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script defer${useEsm ? ` type="module"` : ''} src="/dist/index.js"></script>
  <title>${projectName}</title>
</head>
<body></body>
</html>
        `;
                packageJson.scripts['dev'] = 'live-server --no-browser';
                packageJson.devDependencies.push('live-server');
            }
            addNodemon = choice;
        }
    }
    return addNodemon;
}
let sourceMapType;
async function getSourceMapType() {
    if (sourceMapType == undefined) {
        const { type } = await inquirer.prompt({
            type: 'list',
            name: 'type',
            choices: ['Inline', 'Separate', 'None'],
            message: 'Source map type?'
        });
        sourceMapType = type;
    }
    return sourceMapType;
}
async function getTsconfig(esTarget, moduleType, target) {
    const sourceMapType = await getSourceMapType();
    let conf = {
        compilerOptions: {
            target: esTarget,
            module: moduleType,
            strict: true,
            inlineSourceMap: sourceMapType.match(/inline/i) ? true : undefined,
            sourceMap: sourceMapType.match(/separate/i) ? true : undefined,
            outDir: 'dist',
            esModuleInterop: true,
            lib: target == 'web' ? ['dom'] : [],
            moduleResolution: target == 'node' ? 'node' : undefined
        }
    };
    Object.entries(conf.compilerOptions).forEach(([key, prop]) => prop == undefined && delete conf.compilerOptions[key]);
    return conf;
}
let buildTool;
async function getBuildTool() {
    if (buildTool == undefined) {
        const { tool } = await inquirer.prompt({
            type: 'list',
            name: 'tool',
            message: 'Build tool?',
            choices: ['esbuild', 'tsc']
        });
        if (tool == 'tsc') {
            packageJson.scripts.build = 'tsc src/index.ts';
            packageJson.scripts.watch = 'tsc -w src/index.ts';
        }
        else if (tool == 'esbuild') {
            packageJson.scripts.build = 'node build/index.js';
            packageJson.scripts.watch = 'node build/index.js -w';
        }
        gitignore.push('dist/');
        buildTool = tool;
    }
    return buildTool;
}
let useEslint;
async function getUseEslint() {
    if (useEslint == undefined) {
        const { eslint } = await inquirer.prompt({
            type: 'confirm',
            name: 'eslint',
            message: 'Use eslint?',
            default: true
        });
        files['.eslintrc.js'] = ``;
        packageJson.devDependencies.push('eslint');
        reccomendedExtension('dbaeumer.vscode-eslint');
        useEslint = eslint;
    }
    return useEslint;
}
let usePrettier;
async function getUsePrettier() {
    if (usePrettier != undefined) {
        const { prettier } = await inquirer.prompt({
            type: 'confirm',
            name: 'prettier',
            message: 'Use prettier?',
            default: true
        });
        if (usePrettier) {
            packageJson.prettier = {
                semi: false,
                singleQuote: true,
                useTabs: false,
                tabWidth: 2,
                printWidth: 100,
                arrowParens: 'avoid'
            };
            packageJson.devDependencies.push('prettier', 'prettier-plugin-organize-imports', 'prettier-plugin-jsdoc');
            reccomendedExtension('esbenp.prettier-vscode');
        }
        usePrettier = prettier;
    }
    return usePrettier;
}
let projectType;
async function getProjectType(avalibleTypes) {
    if (projectType == undefined) {
        const { type } = await inquirer.prompt({
            type: 'list',
            name: 'type',
            message: 'What kind of Typescript project?',
            choices: avalibleTypes
        });
        projectType = type;
    }
    return projectType;
}
let editor;
async function getEditor() {
    if (editor == undefined) {
        const { e } = await inquirer.prompt({
            type: 'list',
            name: 'e',
            message: 'Editor?',
            default: 'vim',
            choices: ['vim', 'vscode', 'unspecified']
        });
        editor = e;
    }
    return editor;
}
function reccomendedExtension(extensionName) {
    const path = '.vscode/extensions.json';
    if (!(path in files))
        files[path] = { extensions: [] };
    files[path].extensions.push(extensionName);
}
let packageManager;
async function getPackageManager() {
    if (packageManager == undefined) {
        const { packager } = await inquirer.prompt({
            type: 'list',
            name: 'packager',
            message: 'Pacakge Manager?',
            choices: ['pnpm', 'npm']
        });
        packageJson.scripts.start = 'node dist/index.js';
        gitignore.push('node_modules/');
        packageManager = packager;
    }
    return packageManager;
}
let moduleType;
async function getModuleType(buildTool) {
    const estarg = await getEsTarget(buildTool);
    const targ = await getBuildTarget();
    if (moduleType == undefined) {
        switch (estarg) {
            case 'es3':
            case 'es5':
                moduleType = 'commonjs';
                break;
            case 'es2015':
            case 'es2016':
            case 'es2017':
            case 'es2018':
            case 'es2019':
                moduleType = 'es2015';
                break;
            case 'es2020':
            case 'es2021':
                moduleType = 'es2020';
                break;
            case 'es2022':
                moduleType = 'es2022';
                break;
            case 'esnext':
                moduleType = targ == 'node' ? 'nodenext' : 'esnext';
                break;
            default:
                throw new Error(`Unhandled module type ${moduleType}`);
        }
    }
    return moduleType;
}
let buildTarget;
async function getBuildTarget() {
    if (buildTarget == undefined) {
        const { targ } = await inquirer.prompt({
            type: 'list',
            name: 'targ',
            message: 'Build target?',
            choices: ['node', 'web']
        });
        buildTarget = targ;
    }
    return buildTarget;
}
/** Generates a JS file that uses esbuild to build projects. */
async function getEsbuildConfig(moduleType) {
    const { minify, bundle } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'minify',
            default: true,
            message: 'Minify for production?'
        },
        {
            type: 'list',
            name: 'bundle',
            default: 1,
            choices: ['All', 'Externals only', 'None'],
            message: 'Bundle modules?'
        }
    ]);
    let devModeCheck = false;
    let plugins = {};
    let externalsPlugin = {
        makeAllPackagesExternalPlugin: `const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}`
    };
    const choiceParsed = (choice) => {
        if (choice == true) {
            return 'true';
        }
        if (choice == false) {
            return 'false';
        }
        if (choice.match(/always|all/i)) {
            return 'true';
        }
        if (choice.match(/external/i)) {
            plugins = { ...plugins, ...externalsPlugin };
            return 'true';
        }
        if (choice.match(/never/i)) {
            return 'false';
        }
        if (choice.match(/prod/i)) {
            devModeCheck = true;
            return `!DEV`;
        }
        if (choice.match(/dev/i)) {
            devModeCheck = true;
            return `DEV`;
        }
    };
    let config = '';
    if (esmSupported) {
        config += `import esbuild from 'esbuild'\n\n`;
    }
    else {
        config += `const esbuild = require('esbuild')\n\n`;
    }
    const target = await getBuildTarget();
    let sourcemap = await getSourceMapType();
    if (sourcemap.match(/inline/i)) {
        sourcemap = 'inline';
    }
    else if (sourcemap.match(/separate/i)) {
        sourcemap = 'linked';
    }
    else {
        sourcemap = '';
    }
    config += `esbuild.build({
  entryPoints: ['src/index.ts'],
  watch: process.argv.includes('-w'),
  target: ['${await getEsTarget('esbuild')}'],
  bundle: ${choiceParsed(bundle)},
  format: "${moduleType}",
  minify: ${choiceParsed(minify)},${target == 'node' ? `target: 'node',` : ''}${sourcemap
        ? `
  sourcemap: ${sourcemap == 'linked' ? 'true' : `'inline'`},`
        : ''}${plugins
        ? `
  plugins: [
    ${Object.keys(plugins).join(',\n    ')}
  ],`
        : ''}
  outdir: 'dist',
})
`;
    if (devModeCheck) {
        config = `const DEV = process.env.node_env == 'development'

${config}`;
    }
    if (Object.keys(plugins)) {
        config = `${Object.values(plugins).join(`\n`)}

${config}`;
    }
    return { config };
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxPQUFPLENBQUE7QUFDN0IsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFBO0FBQy9CLE9BQU8sSUFBSSxNQUFNLE1BQU0sQ0FBQTtBQUN2QixPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsSUFBSSxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDL0MsT0FBTyxHQUFHLE1BQU0sS0FBSyxDQUFBO0FBQ3JCLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUN6QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBRWxFLElBQUksV0FBVyxHQUEyQjtJQUN4QyxZQUFZLEVBQUUsRUFBRTtJQUNoQixPQUFPLEVBQUUsRUFBRTtJQUNYLGVBQWUsRUFBRSxDQUFDLFlBQVksQ0FBQztDQUNoQyxDQUFBO0FBQ0QsSUFBSSxrQkFBa0IsR0FBc0MsRUFBRSxDQUFBO0FBQzlELElBQUksWUFBcUIsQ0FBQTtBQUV6QixJQUFJLEtBQUssR0FBeUMsRUFBRSxDQUFBO0FBQ3BELElBQUksU0FBUyxHQUFhLEVBQUUsQ0FBQTtBQUU1QixTQUFTLE9BQU8sQ0FBQyxHQUFXO0lBQzFCLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDeEQsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFBO0FBQ2YsQ0FBQztBQUVELEtBQUssVUFBVSxJQUFJO0lBQ2pCLE1BQU0sWUFBWSxHQUFHLENBQUMsU0FBUyxF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