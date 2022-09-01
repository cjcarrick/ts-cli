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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxPQUFPLENBQUE7QUFDN0IsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFBO0FBQy9CLE9BQU8sSUFBSSxNQUFNLE1BQU0sQ0FBQTtBQUN2QixPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsSUFBSSxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDL0MsT0FBTyxHQUFHLE1BQU0sS0FBSyxDQUFBO0FBQ3JCLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUN6QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBRWxFLElBQUksV0FBVyxHQUEyQjtJQUN4QyxZQUFZLEVBQUUsRUFBRTtJQUNoQixPQUFPLEVBQUUsRUFBRTtJQUNYLGVBQWUsRUFBRSxDQUFDLFlBQVksQ0FBQztDQUNoQyxDQUFBO0FBQ0QsSUFBSSxrQkFBa0IsR0FBc0MsRUFBRSxDQUFBO0FBQzlELElBQUksWUFBcUIsQ0FBQTtBQUV6QixJQUFJLEtBQUssR0FBeUMsRUFBRSxDQUFBO0FBQ3BELElBQUksU0FBUyxHQUFhLEVBQUUsQ0FBQTtBQUU1QixTQUFTLE9BQU8sQ0FBQyxHQUFXO0lBQzFCLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDeEQsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFBO0FBQ2YsQ0FBQztBQUVELEtBQUssVUFBVSxJQUFJO0lBQ2pCLE1BQU0sWUFBWSxHQUFHLENBQUMsU0FBUyxFQUFFLG9CQUFvQixDQUFDLENBQUE7SUFDdEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDL0MsTUFBTSxDQUFDLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQTtJQUVoRCxRQUFRLENBQUMsRUFBRTtRQUNULEtBQUssQ0FBQztZQUNKLFdBQVcsQ0FBQyxJQUFJLEdBQUcsTUFBTSxjQUFjLEVBQUUsQ0FBQTtZQUV6QyxNQUFNLFFBQVEsR0FBRyxNQUFNLGlCQUFpQixFQUFFLENBQUE7WUFFMUMsTUFBTSxTQUFTLEdBQUcsTUFBTSxZQUFZLEVBQUUsQ0FBQTtZQUN0QyxJQUFJLFNBQVMsSUFBSSxTQUFTLEVBQUU7Z0JBQzFCLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUMzQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUN6RyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxNQUFNLENBQUE7YUFDakM7aUJBQU07Z0JBQ0wsTUFBTSxRQUFRLEdBQUcsTUFBTSxXQUFXLENBQUMsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxjQUFjLEVBQUUsQ0FBQyxDQUFBO2dCQUN4SCxLQUFLLENBQUMsZUFBZSxDQUFDLEdBQUcsUUFBUSxDQUFBO2FBQ2xDO1lBRUQsTUFBTSxZQUFZLEVBQUUsQ0FBQTtZQUNwQixNQUFNLGNBQWMsRUFBRSxDQUFBO1lBQ3RCLE1BQU0sYUFBYSxDQUFDLE1BQU0sY0FBYyxFQUFFLEVBQUUsQ0FBQyxNQUFNLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLFVBQVUsRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFN0csTUFBTSxLQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUVsQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUU1QixLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQzFCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE1BQU0sY0FBYyxFQUFFLENBQUMsQ0FBQTtZQUUvRCxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsRUFBRTtnQkFDM0QsSUFBSSxPQUFPLFFBQVEsSUFBSSxRQUFRO29CQUFFLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzdFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDbEYsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN2RSxDQUFDLENBQUMsQ0FBQTtZQUVGLE9BQU8sQ0FBQyxTQUFTLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxhQUFhLFVBQVUsR0FBRyxDQUFDLENBQUE7WUFFckUsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUE7WUFFckMsTUFBTSxTQUFTLEdBQUc7Z0JBQ2hCLEdBQUcsRUFBRSxVQUFVO2dCQUNmLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDdEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO2FBQ3ZCLENBQUE7WUFFRCxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3ZFLElBQUksUUFBUSxJQUFJLE1BQU0sRUFBRTtnQkFDdEIsSUFBSSxXQUFXLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRTtvQkFDdEMsTUFBTSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtpQkFDOUU7Z0JBQ0QsSUFBSSxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRTtvQkFDbkMsTUFBTSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2lCQUNyRTthQUNGO2lCQUFNLElBQUksUUFBUSxJQUFJLEtBQUssRUFBRTtnQkFDNUIsSUFBSSxXQUFXLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRTtvQkFDdEMsTUFBTSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtpQkFDM0U7Z0JBQ0QsSUFBSSxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRTtvQkFDbkMsTUFBTSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2lCQUNsRTthQUNGO1lBRUQsT0FBTyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7WUFFMUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1lBRTVFLDJDQUEyQztZQUMzQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQ3ZGLE9BQU8sV0FBVyxDQUFDLFlBQVksQ0FBQTtZQUMvQixPQUFPLFdBQVcsQ0FBQyxlQUFlLENBQUE7WUFDbEMsSUFBSSxHQUFHLEVBQUUsR0FBRyxJQUFJLEVBQUUsR0FBRyxXQUFXLEVBQUUsQ0FBQTtZQUNsQyxJQUFJLFVBQVU7Z0JBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUE7WUFDcEMsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRXhGLE9BQU8sQ0FBQyxxQkFBcUIsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxLQUFLLElBQUksQ0FBQyxDQUFBO1lBRTlELE9BQU07UUFFUjtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDLENBQUE7S0FDNUM7QUFDSCxDQUFDO0FBRUQsSUFBSSxRQUEwSCxDQUFBO0FBQzlILEtBQUssVUFBVSxXQUFXLENBQUMsU0FBNEI7SUFDckQsSUFBSSxRQUFRLElBQUksU0FBUyxFQUFFO1FBQ3pCLE1BQU0sT0FBTyxHQUNYLFNBQVMsSUFBSSxLQUFLO1lBQ2hCLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUM7WUFDaEgsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUV0RyxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ25DLE9BQU87WUFDUCxPQUFPLEVBQ0wsU0FBUyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsNEZBQTRGLENBQUMsQ0FBQyxDQUFDLGFBQWE7WUFDbkksSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsS0FBSztZQUNYLE9BQU8sRUFBRSxTQUFTLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFFBQVE7WUFDdkQsSUFBSSxFQUFFLE1BQU07U0FDYixDQUFDLENBQUE7UUFDRixJQUFJLEdBQUksSUFBZSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RELFFBQVEsR0FBRyxJQUFJLENBQUE7UUFFZixzREFBc0Q7UUFDdEQsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFCLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQTtLQUNyQztJQUNELE9BQU8sUUFBUSxDQUFBO0FBQ2pCLENBQUM7QUFFRCxJQUFJLFdBQW1CLENBQUE7QUFDdkIsS0FBSyxVQUFVLGNBQWM7SUFDM0IsSUFBSSxXQUFXLElBQUksU0FBUyxFQUFFO1FBQzVCLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDckMsSUFBSSxFQUFFLE9BQU87WUFDYixJQUFJLEVBQUUsTUFBTTtZQUNaLFFBQVEsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQztZQUM1RSxPQUFPLEVBQUUsZUFBZTtTQUN6QixDQUFDLENBQUE7UUFFRixJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFO1lBQzFDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDM0UsTUFBTSxPQUFPLEdBQUcsQ0FBQyxpQ0FBaUMsRUFBRSw0QkFBNEIsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUMxRixNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO2dCQUN6QyxJQUFJLEVBQUUsTUFBTTtnQkFDWixJQUFJLEVBQUUsVUFBVTtnQkFDaEIsT0FBTyxFQUFFLEdBQUcsR0FBRyxrQ0FBa0M7Z0JBQ2pELE9BQU87YUFDUixDQUFDLENBQUE7WUFFRixRQUFRLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLEVBQUU7Z0JBQzdDLEtBQUssQ0FBQztvQkFDSixJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRTt3QkFDbkQsT0FBTyxDQUFDLDJHQUEyRyxDQUFDLENBQUE7d0JBQ3BILE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7cUJBQ2hCO29CQUNELE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQTtvQkFDaEYsTUFBSztnQkFDUCxLQUFLLENBQUM7b0JBQ0osTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7b0JBQzVELE1BQUs7Z0JBQ1A7b0JBQ0UsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTthQUNsQjtTQUNGO1FBQ0QsV0FBVyxHQUFHLElBQUksQ0FBQTtLQUNuQjtJQUNELE9BQU8sV0FBVyxDQUFBO0FBQ3BCLENBQUM7QUFFRCxJQUFJLFVBQW1CLENBQUE7QUFDdkIsS0FBSyxVQUFVLGFBQWEsQ0FBQyxXQUEyQixFQUFFLE1BQWUsRUFBRSxXQUFtQjtJQUM1RixJQUFJLFVBQVUsSUFBSSxTQUFTLEVBQUU7UUFDM0IsSUFBSSxXQUFXLElBQUksTUFBTSxFQUFFO1lBQ3pCLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBQ3ZDLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxxQ0FBcUM7Z0JBQzlDLE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRSxRQUFRO2FBQ2YsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxNQUFNLEVBQUU7Z0JBQ1YsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyx1QkFBdUIsQ0FBQTtnQkFDcEQsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7YUFDNUM7WUFDRCxVQUFVLEdBQUcsTUFBTSxDQUFBO1NBQ3BCO2FBQU0sSUFBSSxXQUFXLElBQUksS0FBSyxFQUFFO1lBQy9CLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBQ3ZDLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSx5Q0FBeUM7Z0JBQ2xELE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRSxRQUFRO2FBQ2YsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxNQUFNLEVBQUU7Z0JBQ1YsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHOzs7OztpQkFLYixNQUFNLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFO1dBQ3BDLFdBQVc7Ozs7U0FJYixDQUFBO2dCQUNELFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsMEJBQTBCLENBQUE7Z0JBQ3ZELFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO2FBQ2hEO1lBQ0QsVUFBVSxHQUFHLE1BQU0sQ0FBQTtTQUNwQjtLQUNGO0lBQ0QsT0FBTyxVQUFVLENBQUE7QUFDbkIsQ0FBQztBQUVELElBQUksYUFBcUIsQ0FBQTtBQUN6QixLQUFLLFVBQVUsZ0JBQWdCO0lBQzdCLElBQUksYUFBYSxJQUFJLFNBQVMsRUFBRTtRQUM5QixNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ3JDLElBQUksRUFBRSxNQUFNO1lBQ1osSUFBSSxFQUFFLE1BQU07WUFDWixPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQztZQUN2QyxPQUFPLEVBQUUsa0JBQWtCO1NBQzVCLENBQUMsQ0FBQTtRQUNGLGFBQWEsR0FBRyxJQUFJLENBQUE7S0FDckI7SUFDRCxPQUFPLGFBQWEsQ0FBQTtBQUN0QixDQUFDO0FBRUQsS0FBSyxVQUFVLFdBQVcsQ0FBQyxRQUFnQixFQUFFLFVBQWtCLEVBQUUsTUFBc0I7SUFDckYsTUFBTSxhQUFhLEdBQUcsTUFBTSxnQkFBZ0IsRUFBRSxDQUFBO0lBQzlDLElBQUksSUFBSSxHQUFRO1FBQ2QsZUFBZSxFQUFFO1lBQ2YsTUFBTSxFQUFFLFFBQVE7WUFDaEIsTUFBTSxFQUFFLFVBQVU7WUFDbEIsTUFBTSxFQUFFLElBQUk7WUFDWixlQUFlLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ2xFLFNBQVMsRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDOUQsTUFBTSxFQUFFLE1BQU07WUFDZCxlQUFlLEVBQUUsSUFBSTtZQUNyQixHQUFHLEVBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuQyxnQkFBZ0IsRUFBRSxNQUFNLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVM7U0FDeEQ7S0FDRixDQUFBO0lBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksSUFBSSxTQUFTLElBQUksT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFFcEgsT0FBTyxJQUFJLENBQUE7QUFDYixDQUFDO0FBRUQsSUFBSSxTQUE0QixDQUFBO0FBQ2hDLEtBQUssVUFBVSxZQUFZO0lBQ3pCLElBQUksU0FBUyxJQUFJLFNBQVMsRUFBRTtRQUMxQixNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ3JDLElBQUksRUFBRSxNQUFNO1lBQ1osSUFBSSxFQUFFLE1BQU07WUFDWixPQUFPLEVBQUUsYUFBYTtZQUN0QixPQUFPLEVBQUUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDO1NBQzVCLENBQUMsQ0FBQTtRQUNGLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRTtZQUNqQixXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxrQkFBa0IsQ0FBQTtZQUM5QyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxxQkFBcUIsQ0FBQTtTQUNsRDthQUFNLElBQUksSUFBSSxJQUFJLFNBQVMsRUFBRTtZQUM1QixXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxxQkFBcUIsQ0FBQTtZQUNqRCxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyx3QkFBd0IsQ0FBQTtTQUNyRDtRQUNELFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdkIsU0FBUyxHQUFHLElBQUksQ0FBQTtLQUNqQjtJQUNELE9BQU8sU0FBUyxDQUFBO0FBQ2xCLENBQUM7QUFFRCxJQUFJLFNBQWtCLENBQUE7QUFDdEIsS0FBSyxVQUFVLFlBQVk7SUFDekIsSUFBSSxTQUFTLElBQUksU0FBUyxFQUFFO1FBQzFCLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDdkMsSUFBSSxFQUFFLFNBQVM7WUFDZixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxhQUFhO1lBQ3RCLE9BQU8sRUFBRSxJQUFJO1NBQ2QsQ0FBQyxDQUFBO1FBRUYsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUUxQixXQUFXLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMxQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBRTlDLFNBQVMsR0FBRyxNQUFNLENBQUE7S0FDbkI7SUFDRCxPQUFPLFNBQVMsQ0FBQTtBQUNsQixDQUFDO0FBRUQsSUFBSSxXQUFvQixDQUFBO0FBQ3hCLEtBQUssVUFBVSxjQUFjO0lBQzNCLElBQUksV0FBVyxJQUFJLFNBQVMsRUFBRTtRQUM1QixNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ3pDLElBQUksRUFBRSxTQUFTO1lBQ2YsSUFBSSxFQUFFLFVBQVU7WUFDaEIsT0FBTyxFQUFFLGVBQWU7WUFDeEIsT0FBTyxFQUFFLElBQUk7U0FDZCxDQUFDLENBQUE7UUFFRixJQUFJLFdBQVcsRUFBRTtZQUNmLFdBQVcsQ0FBQyxRQUFRLEdBQUc7Z0JBQ3JCLElBQUksRUFBRSxLQUFLO2dCQUNYLFdBQVcsRUFBRSxJQUFJO2dCQUNqQixPQUFPLEVBQUUsS0FBSztnQkFDZCxRQUFRLEVBQUUsQ0FBQztnQkFDWCxVQUFVLEVBQUUsR0FBRztnQkFDZixXQUFXLEVBQUUsT0FBTzthQUNyQixDQUFBO1lBRUQsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLGtDQUFrQyxFQUFFLHVCQUF1QixDQUFDLENBQUE7WUFDekcsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtTQUMvQztRQUVELFdBQVcsR0FBRyxRQUFRLENBQUE7S0FDdkI7SUFDRCxPQUFPLFdBQVcsQ0FBQTtBQUNwQixDQUFDO0FBRUQsSUFBSSxXQUFtQixDQUFBO0FBQ3ZCLEtBQUssVUFBVSxjQUFjLENBQUMsYUFBdUI7SUFDbkQsSUFBSSxXQUFXLElBQUksU0FBUyxFQUFFO1FBQzVCLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDckMsSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsTUFBTTtZQUNaLE9BQU8sRUFBRSxrQ0FBa0M7WUFDM0MsT0FBTyxFQUFFLGFBQWE7U0FDdkIsQ0FBQyxDQUFBO1FBQ0YsV0FBVyxHQUFHLElBQUksQ0FBQTtLQUNuQjtJQUNELE9BQU8sV0FBVyxDQUFBO0FBQ3BCLENBQUM7QUFFRCxJQUFJLE1BQWMsQ0FBQTtBQUNsQixLQUFLLFVBQVUsU0FBUztJQUN0QixJQUFJLE1BQU0sSUFBSSxTQUFTLEVBQUU7UUFDdkIsTUFBTSxFQUFFLENBQUMsRUFBRSxHQUFHLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUNsQyxJQUFJLEVBQUUsTUFBTTtZQUNaLElBQUksRUFBRSxHQUFHO1lBQ1QsT0FBTyxFQUFFLFNBQVM7WUFDbEIsT0FBTyxFQUFFLEtBQUs7WUFDZCxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBQztTQUMxQyxDQUFDLENBQUE7UUFFRixNQUFNLEdBQUcsQ0FBQyxDQUFBO0tBQ1g7SUFDRCxPQUFPLE1BQU0sQ0FBQTtBQUNmLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLGFBQXFCO0lBQ2pELE1BQU0sSUFBSSxHQUFHLHlCQUF5QixDQUFBO0lBQ3RDLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUM7UUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUE7SUFDdEQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7QUFDNUMsQ0FBQztBQUVELElBQUksY0FBc0IsQ0FBQTtBQUMxQixLQUFLLFVBQVUsaUJBQWlCO0lBQzlCLElBQUksY0FBYyxJQUFJLFNBQVMsRUFBRTtRQUMvQixNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ3pDLElBQUksRUFBRSxNQUFNO1lBQ1osSUFBSSxFQUFFLFVBQVU7WUFDaEIsT0FBTyxFQUFFLGtCQUFrQjtZQUMzQixPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDO1NBQ3pCLENBQUMsQ0FBQTtRQUVGLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLG9CQUFvQixDQUFBO1FBQ2hELFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDL0IsY0FBYyxHQUFHLFFBQVEsQ0FBQTtLQUMxQjtJQUNELE9BQU8sY0FBYyxDQUFBO0FBQ3ZCLENBQUM7QUFFRCxJQUFJLFVBQTBGLENBQUE7QUFDOUYsS0FBSyxVQUFVLGFBQWEsQ0FBQyxTQUE0QjtJQUN2RCxNQUFNLE1BQU0sR0FBRyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUMzQyxNQUFNLElBQUksR0FBRyxNQUFNLGNBQWMsRUFBRSxDQUFBO0lBRW5DLElBQUksVUFBVSxJQUFJLFNBQVMsRUFBRTtRQUMzQixRQUFRLE1BQU0sRUFBRTtZQUNkLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxLQUFLO2dCQUNSLFVBQVUsR0FBRyxVQUFVLENBQUE7Z0JBQ3ZCLE1BQUs7WUFDUCxLQUFLLFFBQVEsQ0FBQztZQUNkLEtBQUssUUFBUSxDQUFDO1lBQ2QsS0FBSyxRQUFRLENBQUM7WUFDZCxLQUFLLFFBQVEsQ0FBQztZQUNkLEtBQUssUUFBUTtnQkFDWCxVQUFVLEdBQUcsUUFBUSxDQUFBO2dCQUNyQixNQUFLO1lBQ1AsS0FBSyxRQUFRLENBQUM7WUFDZCxLQUFLLFFBQVE7Z0JBQ1gsVUFBVSxHQUFHLFFBQVEsQ0FBQTtnQkFDckIsTUFBSztZQUNQLEtBQUssUUFBUTtnQkFDWCxVQUFVLEdBQUcsUUFBUSxDQUFBO2dCQUNyQixNQUFLO1lBQ1AsS0FBSyxRQUFRO2dCQUNYLFVBQVUsR0FBRyxJQUFJLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtnQkFDbkQsTUFBSztZQUNQO2dCQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLFVBQVUsRUFBRSxDQUFDLENBQUE7U0FDekQ7S0FDRjtJQUNELE9BQU8sVUFBVSxDQUFBO0FBQ25CLENBQUM7QUFFRCxJQUFJLFdBQTJCLENBQUE7QUFDL0IsS0FBSyxVQUFVLGNBQWM7SUFDM0IsSUFBSSxXQUFXLElBQUksU0FBUyxFQUFFO1FBQzVCLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDckMsSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsTUFBTTtZQUNaLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUM7U0FDekIsQ0FBQyxDQUFBO1FBQ0YsV0FBVyxHQUFHLElBQUksQ0FBQTtLQUNuQjtJQUNELE9BQU8sV0FBVyxDQUFBO0FBQ3BCLENBQUM7QUFFRCwrREFBK0Q7QUFDL0QsS0FBSyxVQUFVLGdCQUFnQixDQUFDLFVBQXlCO0lBQ3ZELE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQy9DO1lBQ0UsSUFBSSxFQUFFLFNBQVM7WUFDZixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxJQUFJO1lBQ2IsT0FBTyxFQUFFLHdCQUF3QjtTQUNsQztRQUNEO1lBQ0UsSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxDQUFDO1lBQ1YsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sQ0FBQztZQUMxQyxPQUFPLEVBQUUsaUJBQWlCO1NBQzNCO0tBQ0YsQ0FBQyxDQUFBO0lBRUYsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFBO0lBQ3hCLElBQUksT0FBTyxHQUFxQyxFQUFFLENBQUE7SUFFbEQsSUFBSSxlQUFlLEdBQUc7UUFDcEIsNkJBQTZCLEVBQUU7Ozs7OztFQU1qQztLQUNDLENBQUE7SUFFRCxNQUFNLFlBQVksR0FBRyxDQUFDLE1BQXdCLEVBQUUsRUFBRTtRQUNoRCxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7WUFDbEIsT0FBTyxNQUFNLENBQUE7U0FDZDtRQUNELElBQUksTUFBTSxJQUFJLEtBQUssRUFBRTtZQUNuQixPQUFPLE9BQU8sQ0FBQTtTQUNmO1FBQ0QsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQy9CLE9BQU8sTUFBTSxDQUFBO1NBQ2Q7UUFDRCxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDN0IsT0FBTyxHQUFHLEVBQUUsR0FBRyxPQUFPLEVBQUUsR0FBRyxlQUFlLEVBQUUsQ0FBQTtZQUM1QyxPQUFPLE1BQU0sQ0FBQTtTQUNkO1FBQ0QsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzFCLE9BQU8sT0FBTyxDQUFBO1NBQ2Y7UUFDRCxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDekIsWUFBWSxHQUFHLElBQUksQ0FBQTtZQUNuQixPQUFPLE1BQU0sQ0FBQTtTQUNkO1FBQ0QsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3hCLFlBQVksR0FBRyxJQUFJLENBQUE7WUFDbkIsT0FBTyxLQUFLLENBQUE7U0FDYjtJQUNILENBQUMsQ0FBQTtJQUVELElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQTtJQUVmLElBQUksWUFBWSxFQUFFO1FBQ2hCLE1BQU0sSUFBSSxtQ0FBbUMsQ0FBQTtLQUM5QztTQUFNO1FBQ0wsTUFBTSxJQUFJLHdDQUF3QyxDQUFBO0tBQ25EO0lBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxjQUFjLEVBQUUsQ0FBQTtJQUNyQyxJQUFJLFNBQVMsR0FBRyxNQUFNLGdCQUFnQixFQUFFLENBQUE7SUFFeEMsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1FBQzlCLFNBQVMsR0FBRyxRQUFRLENBQUE7S0FDckI7U0FBTSxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUU7UUFDdkMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtLQUNyQjtTQUFNO1FBQ0wsU0FBUyxHQUFHLEVBQUUsQ0FBQTtLQUNmO0lBRUQsTUFBTSxJQUFJOzs7Y0FHRSxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQUM7WUFDOUIsWUFBWSxDQUFDLE1BQU0sQ0FBQzthQUNuQixVQUFVO1lBQ1gsWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQ3pFLFNBQVM7UUFDUCxDQUFDLENBQUM7ZUFDTyxTQUFTLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBRztRQUN2RCxDQUFDLENBQUMsRUFDTixHQUNFLE9BQU87UUFDTCxDQUFDLENBQUM7O01BRUYsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO0tBQ3JDO1FBQ0MsQ0FBQyxDQUFDLEVBQ047OztDQUdELENBQUE7SUFDQyxJQUFJLFlBQVksRUFBRTtRQUNoQixNQUFNLEdBQUc7O0VBRVgsTUFBTSxFQUFFLENBQUE7S0FDUDtJQUNELElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUN4QixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7O0VBRS9DLE1BQU0sRUFBRSxDQUFBO0tBQ1A7SUFFRCxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUE7QUFDbkIsQ0FBQztBQUVELElBQUksRUFBRSxDQUFBIn0=