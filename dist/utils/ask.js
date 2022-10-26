import inquirer from 'inquirer';
import { runtimes, buildTools, getAvalibleEsTargets, getModuleType, packageManagers } from '.';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2Fzay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxFQUNMLFFBQVEsRUFDUixVQUFVLEVBQ1Ysb0JBQW9CLEVBQ3BCLGFBQWEsRUFDYixlQUFlLEVBQ2hCLE1BQU0sR0FBRyxDQUFBO0FBR1YsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLFVBQVUsR0FBRztJQUMvQixNQUFNLEVBQ0osT0FBTyxFQUNQLFFBQVEsRUFDUixjQUFjLEVBQ2QsYUFBYSxFQUNiLE1BQU0sRUFFTixRQUFRLEVBQ1IsTUFBTSxFQUNOLEdBQUcsRUFDSCxTQUFTLEVBQ1QsU0FBUyxFQUNULEdBQUcsRUFDSCxTQUFTLEVBQ1YsR0FBRyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDeEI7WUFDRSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxVQUFVO1lBQ25CLElBQUksRUFBRSxNQUFNO1lBQ1osSUFBSSxFQUFFLEtBQUs7WUFDWCxPQUFPLEVBQUUsUUFBUTtTQUNsQjtRQUNEO1lBQ0UsSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixPQUFPLEVBQUUsa0JBQWtCO1lBQzNCLElBQUksRUFBRSxNQUFNO1lBQ1osSUFBSSxFQUFFLEtBQUs7WUFDWCxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLEtBQUs7U0FDL0I7UUFDRDtZQUNFLElBQUksRUFBRSxXQUFXO1lBQ2pCLE9BQU8sRUFBRSxhQUFhO1lBQ3RCLElBQUksRUFBRSxNQUFNO1lBQ1osSUFBSSxFQUFFLEtBQUs7WUFDWCxPQUFPLEVBQUUsVUFBVTtZQUNuQixJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLEtBQUs7U0FDL0I7UUFDRDtZQUNF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