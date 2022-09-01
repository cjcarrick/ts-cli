#!/usr/bin/env node
import { execa } from 'execa';
import inquirer from 'inquirer';
import path from 'path';
import { existsSync, promises as fs } from 'fs';
import chalk from 'chalk';
const cwd = path.resolve(process.cwd());
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
            const projectDir = path.join(cwd, await getProjectName());
            Object.entries(files).forEach(async ([filePath, contents]) => {
                if (typeof contents != 'string')
                    contents = JSON.stringify(contents, null, 2);
                await fs.mkdir(path.join(projectDir, path.dirname(filePath)), { recursive: true });
                await fs.writeFile(path.join(projectDir, filePath), contents, 'utf8');
            });
            infoMsg(`Wrote ${Object.keys(files).length} files to ${projectDir}.`);
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
        if (existsSync(path.join(cwd, name))) {
            const dir = path.join(cwd, name).replace(process.env.HOME || '', '~');
            const choices = ['Append .old to existing project', 'Overwrite existing project', 'Abort'];
            const { decision } = await inquirer.prompt({
                type: 'list',
                name: 'decision',
                message: `${dir} already exists. How to proceed?`,
                choices
            });
            switch (choices.findIndex(a => a == decision)) {
                case 0:
                    if (existsSync(path.join(cwd, `${name}.old`))) {
                        infoMsg('Could not append .old because there is already a directory by the same name with the same .old extension.');
                        process.exit(1);
                    }
                    await fs.rename(path.join(cwd, name), path.join(cwd, `${name}.old`));
                    break;
                case 1:
                    await fs.rm(path.join(cwd, name), { recursive: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxPQUFPLENBQUE7QUFDN0IsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFBO0FBQy9CLE9BQU8sSUFBSSxNQUFNLE1BQU0sQ0FBQTtBQUN2QixPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsSUFBSSxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDL0MsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQ3pCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUE7QUFFdkMsSUFBSSxXQUFXLEdBQTJCO0lBQ3hDLFlBQVksRUFBRSxFQUFFO0lBQ2hCLE9BQU8sRUFBRSxFQUFFO0lBQ1gsZUFBZSxFQUFFLENBQUMsWUFBWSxDQUFDO0NBQ2hDLENBQUE7QUFDRCxJQUFJLGtCQUFrQixHQUFzQyxFQUFFLENBQUE7QUFDOUQsSUFBSSxZQUFxQixDQUFBO0FBRXpCLElBQUksS0FBSyxHQUF5QyxFQUFFLENBQUE7QUFDcEQsSUFBSSxTQUFTLEdBQWEsRUFBRSxDQUFBO0FBRTVCLFNBQVMsT0FBTyxDQUFDLEdBQVc7SUFDMUIsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUN4RCxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUE7QUFDZixDQUFDO0FBRUQsS0FBSyxVQUFVLElBQUk7SUFDakIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtJQUN0RCxNQUFNLElBQUksR0FBRyxNQUFNLGNBQWMsQ0FBQyxZQUFZ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