#!/usr/bin/env node
import chalk from 'chalk';
import path from 'path';
import getName from './utils/getName.js';
import askForArgs from './utils/ask.js';
import useParams from './utils/handleParams.js';
import { cwd, infoMsg, willTranspile } from './utils/index.js';
import { installDeps } from './utils/npm.js';
import Scripts from './utils/scripts.js';
import readme from './utils/readme.js';
import { parsed } from './utils/yargs.js';
main();
async function main() {
    // Initialize ---
    const name = await getName(parsed?.name);
    let params;
    if (parsed && 'runtime' in parsed) {
        infoMsg(`Using default arguments for a ${parsed.runtime} runtime:`);
        console.log(parsed);
        params = parsed;
    }
    else {
        params = { name, ...(await askForArgs()) };
    }
    const start = new Date().getTime();
    const gitignore = ['dist/', 'node_modules/'];
    const dir = path.join(cwd, name);
    const { packageJson, scripts, files } = useParams(params, name);
    // ---
    // Write files ---
    infoMsg('Creating files...');
    files.add({
        name: willTranspile(params.runtime) ? 'src/index.ts' : 'index.ts',
        contents: params.css && params.buildTool == 'esbuild'
            ? `import './style.scss'\n`
            : ''
    });
    files.add({ name: 'package.json', contents: packageJson.toString() });
    files.add({ name: 'README.md', contents: readme(packageJson.data, params) });
    files.add({ name: '.gitignore', contents: gitignore.join('\n') });
    await files.write(dir);
    // ---
    // Install deps ---
    infoMsg(`Installing dependencies with ${params.packageManager}...`);
    await new Scripts(process)
        .addMany(installDeps(params.packageManager, packageJson))
        .exec(dir);
    // ---
    // Post install ---
    infoMsg('Running post install scripts...');
    await scripts.exec(dir);
    // ---
    // Finish message ---
    infoMsg('Done. Created ' +
        chalk.blue(chalk.bold(name)) +
        ' at ' +
        chalk.blue(dir) +
        ` in ${new Date().getTime() - start}ms`);
    // ---
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUN6QixPQUFPLElBQUksTUFBTSxNQUFNLENBQUE7QUFDdkIsT0FBTyxPQUFPLE1BQU0sb0JBQW9CLENBQUE7QUFDeEMsT0FBTyxVQUFVLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkMsT0FBTyxTQUFTLE1BQU0seUJBQXlCLENBQUE7QUFDL0MsT0FBTyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQzVDLE9BQU8sT0FBTyxNQUFNLG9CQUFvQixDQUFBO0FBQ3hDLE9BQU8sTUFBTSxNQUFNLG1CQUFtQixDQUFBO0FBQ3RDLE9BQU8sRUFBVSxNQUFNLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUVqRCxJQUFJLEVBQUUsQ0FBQTtBQUVOLEtBQUssVUFBVSxJQUFJO0lBQ2pCLGlCQUFpQjtJQUNqQixNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDeEMsSUFBSSxNQUFjLENBQUE7SUFFbEIsSUFBSSxNQUFNLElBQUksU0FBUyxJQUFJLE1BQU0sRUFBRTtRQUNqQyxPQUFPLENBQUMsaUNBQWlDLE1BQU0sQ0FBQyxPQUFPLFdBQVcsQ0FBQyxDQUFBO1FBQ25FLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkIsTUFBTSxHQUFHLE1BQU0sQ0FBQTtLQUNoQjtTQUFNO1FBQ0wsTUFBTSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQTtLQUMzQztJQUVELE1BQU0sS0FBSyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbEMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUE7SUFDNUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDaEMsTUFBTSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMvRCxNQUFNO0lBRU4sa0JBQWtCO0lBQ2xCLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQzVCLEtBQUssQ0FBQyxHQUFHLENBQUM7UUFDUixJQUFJLEVBQUUsYUFBYSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxVQUFVO1FBQ2pFLFFBQVEsRUFDTixNQUFNLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxTQUFTLElBQUksU0FBUztZQUN6QyxDQUFDLENBQUMseUJBQXlCO1lBQzNCLENBQUMsQ0FBQyxFQUFFO0tBQ1QsQ0FBQyxDQUFBO0lBQ0YsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDckUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUM1RSxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDakUsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3RCLE1BQU07SUFFTixtQkFBbUI7SUFDbkIsT0FBTyxDQUFDLGdDQUFnQyxNQUFNLENBQUMsY0FBYyxLQUFLLENBQUMsQ0FBQTtJQUNuRSxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQztTQUN2QixPQUFPLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7U0FDeEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ1osTUFBTTtJQUVOLG1CQUFtQjtJQUNuQixPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQTtJQUMxQyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDdkIsTUFBTTtJQUVOLHFCQUFxQjtJQUNyQixPQUFPLENBQ0wsZ0JBQWdCO1FBQ2QsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVCLE1BQU07UUFDTixLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNmLE9BQU8sSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxLQUFLLElBQUksQ0FDMUMsQ0FBQTtJQUNELE1BQU07QUFDUixDQUFDIn0=