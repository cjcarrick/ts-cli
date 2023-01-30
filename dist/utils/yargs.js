import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runtimes, buildTools, getModuleType } from './index.js';
let args = yargs(hideBin(process.argv))
    .usage('Usage:\n' +
    '  ts-cli [name]\n' +
    '  ts-cli --runtime=<runtime> [preset] [overrides] <name>')
    .positional('name', {
    desc: 'The name of the new project to create',
    type: 'string'
})
    .option('runtime', {
    alias: 'r',
    desc: 'What to transpile TypeScript to be able to run in',
    choices: runtimes
})
    .check(args => {
    if (!args._.length && args.runtime) {
        return new Error('Must specify name when specifying runtime.');
    }
    return true;
})
    .option('builtTool', {
    alias: 'b',
    desc: 'What to build TypeScript with.',
    chioces: buildTools
})
    // Build presets
    .option('barebones', {
    alias: '0',
    desc: 'Disables as many things as possible. Default settings enable most things.',
    group: 'Presets',
    type: 'boolean'
})
    // Overrides
    .option('[no-]dev-script', {
    desc: 'Whether or not to add a dev script (using live-server or Nodemon)',
    type: 'boolean',
    group: 'Overrides'
})
    .option('[no-]eslint', {
    desc: 'Whether or not to use ESLint',
    type: 'boolean',
    group: 'Overrides'
})
    .option('[no-]git', {
    desc: 'Whether or not to use Git',
    type: 'boolean',
    group: 'Overrides'
})
    .option('[no-]prettier', {
    desc: 'Whether or not to use Prettier',
    type: 'boolean',
    group: 'Overrides'
})
    .option('[no-]source-map', {
    desc: 'Whether or not to generate source maps',
    type: 'boolean',
    group: 'Overrides'
})
    .option('[no-]css', {
    // Is this implementation ok? It seems like what people would want most of
    // the time but it takes choice away from the user. I didn't want to focus
    // too much on the CSS side of things for ts-cli.
    desc: 'Whether or not to include CSS files when targeting web. Note that TSC will use vanilla CSS, and ESBuild will use SASS.',
    type: 'boolean',
    group: 'Overrides'
})
    .option('[no-]minify', {
    desc: 'Whether or not to minify transpiled JavaScript',
    type: 'boolean',
    group: 'Overrides'
})
    .option('[no-]bundle', {
    desc: 'Whether or not to bundle modules (ESBuild only)',
    type: 'boolean',
    group: 'Overrides'
})
    .option('[no-]esm', {
    desc: 'Whether or not to use ESM modules',
    type: 'boolean',
    group: 'Overrides'
})
    .option('pnpm', {
    desc: 'Use pnpm as package manager',
    type: 'boolean',
    group: 'Overrides',
    conflicts: ['npm']
})
    .option('npm', {
    desc: 'Use npm as package manager',
    type: 'boolean',
    group: 'Overrides',
    conflicts: ['pnpm']
})
    .parseSync();
export { args as argv };
// Fill defaults
let parsed = undefined;
if (args._[0]) {
    parsed = { name: args._[0] };
}
if (args.runtime) {
    const defaultEsTarget = 'es2021';
    const defaults = {
        name: args._[0] ?? '',
        esTarget: defaultEsTarget,
        modules: getModuleType(defaultEsTarget, args.runtime),
        runtime: args.runtime,
        buildTool: 'esbuild',
        bundleModules: true,
        minify: true,
        sourceMap: true,
        packageManager: 'pnpm',
        prettier: true,
        eslint: true,
        css: true,
        devScript: true,
        git: true
    };
    parsed = Object.entries(defaults).reduce((acc, curr) => ({
        ...acc,
        [curr[0]]: args[curr[0]] ?? curr[1]
    }), {});
    if (args.barebones) {
        parsed = {
            ...parsed,
            prettier: false,
            eslint: false,
            css: false,
            devScript: false,
            git: false,
            sourceMap: false
        };
    }
}
export { parsed };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWFyZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMveWFyZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQ3pCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDdkMsT0FBTyxFQU1MLFFBQVEsRUFDUixVQUFVLEVBQ1YsYUFBYSxFQUNkLE1BQU0sWUFBWSxDQUFBO0FBb0JuQixJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNwQyxLQUFLLENBQ0osVUFBVTtJQUNSLG1CQUFtQjtJQUNuQiwwREFBMEQsQ0FDN0Q7S0FFQSxVQUFVLENBQUMsTUFBTSxFQUFFO0lBQ2xCLElBQUksRUFBRSx1Q0FBdUM7SUFDN0MsSUFBSSxFQUFFLFFBQVE7Q0FDZixDQUFDO0tBRUQsTUFBTSxDQUFDLFNBQVMsRUFBRTtJQUNqQixLQUFLLEVBQUUsR0FBRztJQUNWLElBQUksRUFBRSxtREFBbUQ7SUFDekQsT0FBTyxFQUFFLFFBQVE7Q0FDbEIsQ0FBQztLQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtJQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1FBQ2xDLE9BQU8sSUFBSSxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQTtLQUMvRDtJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ2IsQ0FBQyxDQUFDO0tBRUQsTUFBTSxDQUFDLFdBQVcsRUFBRTtJQUNuQixLQUFLLEVBQUUsR0FBRztJQUNWLElBQUksRUFBRSxnQ0FBZ0M7SUFDdEMsT0FBTyxFQUFFLFVBQVU7Q0FDcEIsQ0FBQztJQUVGLGdCQUFnQjtLQUNmLE1BQU0sQ0FBQyxXQUFXLEVBQUU7SUFDbkIsS0FBSyxFQUFFLEdBQUc7SUFDVixJQUFJLEVBQUUsMkVBQTJFO0lB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