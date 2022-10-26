import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runtimes, buildTools, getModuleType } from '.';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWFyZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMveWFyZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQ3pCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDdkMsT0FBTyxFQU9MLFFBQVEsRUFDUixVQUFVLEVBQ1YsYUFBYSxFQUNkLE1BQU0sR0FBRyxDQUFBO0FBc0JWLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3BDLEtBQUssQ0FDSixVQUFVO0lBQ1IsbUJBQW1CO0lBQ25CLDBEQUEwRCxDQUM3RDtLQUVBLFVBQVUsQ0FBQyxNQUFNLEVBQUU7SUFDbEIsSUFBSSxFQUFFLHVDQUF1QztJQUM3QyxJQUFJLEVBQUUsUUFBUTtDQUNmLENBQUM7S0FFRCxNQUFNLENBQUMsU0FBUyxFQUFFO0lBQ2pCLEtBQUssRUFBRSxHQUFHO0lBQ1YsSUFBSSxFQUFFLG1EQUFtRDtJQUN6RCxPQUFPLEVBQUUsUUFBUTtDQUNsQixDQUFDO0tBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFO0lBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7UUFDbEMsT0FBTyxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFBO0tBQy9EO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDYixDQUFDLENBQUM7S0FFRCxNQUFNLENBQUMsV0FBVyxFQUFFO0lBQ25CLEtBQUssRUFBRSxHQUFHO0lBQ1YsSUFBSSxFQUFFLGdDQUFnQztJQUN0QyxPQUFPLEVBQUUsVUFBVTtDQUNwQixDQUFDO0lBRUYsZ0JBQWdCO0tBQ2YsTUFBTSxDQUFDLFdBQVcsRUFBRTtJQUNuQixLQUFLLEVBQUUsR0FBRztJQUNWLElBQUksRUFBRSwyRUFBMkU7SUFD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