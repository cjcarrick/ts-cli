import inquirer from 'inquirer';
import { runtimes, buildTools, getAvalibleEsTargets, getModuleType, packageManagers } from './index.js';
export default async function Ask() {
    const { runtime, esTarget, packageManager, bundleModules, minify, prettier, eslint, css, buildTool, devScript, git, sourceMap } = await inquirer.prompt([
        {
            name: 'runtime',
            message: 'Runtime?',
            type: 'list',
            loop: false,
            choices: runtimes
        },
        {
            name: 'packageManager',
            message: 'Package manager?',
            type: 'list',
            loop: false,
            choices: packageManagers,
            when: a => a.runTime !== 'bun'
        },
        {
            name: 'buildTool',
            message: 'Build tool?',
            type: 'list',
            loop: false,
            choices: buildTools,
            when: a => a.runTime !== 'bun'
        },
        {
            name: 'bundleModules',
            message: 'Bundle modules?',
            type: 'confirm',
            when: a => a.buildTool == 'esbuild'
        },
        {
            name: 'minify',
            message: 'Minify final JavaScript?',
            type: 'confirm',
            when: a => a.buildTool == 'esbuild'
        },
        {
            name: 'esTarget',
            message: 'ES Target?',
            type: 'list',
            loop: false,
            choices: a => getAvalibleEsTargets(a.buildTool, a.esm).reverse(),
            when: a => a.runtime !== 'bun' &&
                getAvalibleEsTargets(a.buildTool, a.esm).length > 1
        },
        {
            name: 'esm',
            message: 'Use ESM modules?',
            type: 'confirm',
            // Only ask to use ESM when building with TSC when the ES Target supports
            // it. ESBuild only does ESM.
            when: a => a.buildTool == 'tsc' &&
                getModuleType(a.esTarget, a.runtime) !== 'commonjs'
        },
        {
            name: 'css',
            type: 'confirm',
            message: a => (a.buildTool == 'tsc' ? 'Add CSS?' : 'Add SCSS?'),
            when: a => a.runtime == 'web'
        },
        {
            name: 'devScript',
            type: 'confirm',
            message: a => a.runtime == 'node'
                ? 'Add Nodemon for development?'
                : a.runtime == 'bun'
                    ? 'Add script for development?'
                    : 'Add live-server for development?'
        },
        {
            name: 'sourceMap',
            message: 'Generate source maps?',
            type: 'confirm',
            when: a => a.runTime !== 'bun'
        },
        {
            name: 'prettier',
            message: 'Use Prettier?',
            type: 'confirm'
        },
        {
            name: 'eslint',
            message: 'Use ESLint?',
            type: 'confirm'
        },
        {
            name: 'git',
            type: 'confirm',
            message: 'Initialize Git repository?'
        }
    ]);
    return {
        runtime,
        esTarget,
        modules: getModuleType(esTarget, runtime),
        packageManager,
        bundleModules,
        minify,
        prettier,
        eslint,
        css,
        buildTool,
        devScript,
        git,
        sourceMap
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2Fzay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxFQUNMLFFBQVEsRUFDUixVQUFVLEVBQ1Ysb0JBQW9CLEVBQ3BCLGFBQWEsRUFDYixlQUFlLEVBQ2hCLE1BQU0sWUFBWSxDQUFBO0FBR25CLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxVQUFVLEdBQUc7SUFDL0IsTUFBTSxFQUNKLE9BQU8sRUFDUCxRQUFRLEVBQ1IsY0FBYyxFQUNkLGFBQWEsRUFDYixNQUFNLEVBRU4sUUFBUSxFQUNSLE1BQU0sRUFDTixHQUFHLEVBQ0gsU0FBUyxFQUNULFNBQVMsRUFDVCxHQUFHLEVBQ0gsU0FBUyxFQUNWLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQ3hCO1lBQ0UsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsVUFBVTtZQUNuQixJQUFJLEVBQUUsTUFBTTtZQUNaLElBQUksRUFBRSxLQUFLO1lBQ1gsT0FBTyxFQUFFLFFBQVE7U0FDbEI7UUFDRDtZQUNFLElBQUksRUFBRSxnQkFBZ0I7WUFDdEIsT0FBTyxFQUFFLGtCQUFrQjtZQUMzQixJQUFJLEVBQUUsTUFBTTtZQUNaLElBQUksRUFBRSxLQUFLO1lBQ1gsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxLQUFLO1NBQy9CO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsV0FBVztZQUNqQixPQUFPLEVBQUUsYUFBYTtZQUN0QixJQUFJLEVBQUUsTUFBTTtZQUNaLElBQUksRUFBRSxLQUFLO1lBQ1gsT0FBTyxFQUFFLFVBQVU7WUFDbkIsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxLQUFLO1NBQy9CO1FBQ0Q7WUFD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