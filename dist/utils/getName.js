import chalk from 'chalk';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import inquirer from 'inquirer';
import path from 'path';
import { cwd, warnMsg } from './index.js';
export default async function getName(existingName) {
    // Ask for a project name if none was provided in argv
    let name = existingName ??
        (await inquirer.prompt({
            name: 'name',
            message: 'Project name?',
            type: 'input'
        })).name;
    // Check if project exists here already
    const targetDir = path.join(cwd, name);
    if (existsSync(targetDir)) {
        warnMsg(chalk.blue(targetDir) + ' already exists.');
        const { decision } = await inquirer.prompt([
            {
                name: 'decision',
                message: 'How to proceed?',
                type: 'list',
                choices: [
                    'Append .old to existing path',
                    'Remove existing path and continue',
                    'Abort'
                ]
            }
        ]);
        if (decision.match(/\.old/i)) {
            fs.rename(targetDir, targetDir + '.old');
        }
        else if (decision.match(/remove/i)) {
            await fs.unlink(targetDir);
        }
        else {
            // Abort by default to prevent data loss.
            process.exit(1);
        }
    }
    return name;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0TmFtZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9nZXROYW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUN6QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQy9CLE9BQU8sRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUM1QixPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxJQUFJLE1BQU0sTUFBTSxDQUFBO0FBQ3ZCLE9BQU8sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXpDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxVQUFVLE9BQU8sQ0FBQyxZQUFxQjtJQUN6RCxzREFBc0Q7SUFDdEQsSUFBSSxJQUFJLEdBQ04sWUFBWTtRQUNaLENBQ0UsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ3BCLElBQUksRUFBRSxNQUFNO1lBQ1osT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE9BQU87U0FDZCxDQUFDLENBQ0gsQ0FBQyxJQUFJLENBQUE7SUFFUix1Q0FBdUM7SUFFdkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDdEMsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUU7UUFDekIsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsa0JBQWtCLENBQUMsQ0FBQTtRQUVuRCxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ3pDO2dCQUNFLElBQUksRUFBRSxVQUFVO2dCQUNoQixPQUFPLEVBQUUsaUJBQWlCO2dCQUMxQixJQUFJLEVBQUUsTUFBTTtnQkFDWixPQUFPLEVBQUU7b0JBQ1AsOEJBQThCO29CQUM5QixtQ0FBbUM7b0JBQ25DLE9BQU87aUJBQ1I7YUFDRjtTQUNGLENBQUMsQ0FBQTtRQUVGLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUM1QixFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUE7U0FDekM7YUFBTSxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDcEMsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1NBQzNCO2FBQU07WUFDTCx5Q0FBeUM7WUFDekMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUNoQjtLQUNGO0lBRUQsT0FBTyxJQUFJLENBQUE7QUFDYixDQUFDIn0=