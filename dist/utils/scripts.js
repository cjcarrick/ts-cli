import commandExists from 'command-exists';
import { execa } from 'execa';
import chalk from 'chalk';
import { warnMsg } from '../utils';
export const cmdExists = (bin) => new Promise(resolve => commandExists(bin, (err, exists) => resolve(exists)));
export default class Scripts {
    constructor(proc) {
        this.proc = proc;
        this.add = (bin, ...args) => {
            this.stack.push({ bin, args: Array.from(args) });
            return this;
        };
        this.addMany = (scripts) => {
            scripts.forEach(s => this.add(s.bin, ...s.args));
            return this;
        };
        this.exec = async (cwd) => {
            const opts = {
                stdout: this.proc.stdout,
                stdin: this.proc.stdin,
                cwd
            };
            for (let i = 0; i < this.stack.length; i++) {
                const { bin, args } = this.stack[i];
                if (await cmdExists(bin)) {
                    await execa(bin, args, opts);
                }
                else {
                    warnMsg(chalk.blue(bin + (args ? ' ' + args.join(' ') : '')) +
                        ' failed. Command ' +
                        chalk.bold(chalk.blue(bin)) +
                        ' does not exist.');
                }
            }
            return;
        };
        this.stack = [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyaXB0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9zY3JpcHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sYUFBYSxNQUFNLGdCQUFnQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxLQUFLLEVBQVcsTUFBTSxPQUFPLENBQUE7QUFDdEMsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQ3pCLE9BQU8sRUFBa0IsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBS2xELE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQ3ZDLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFFOUUsTUFBTSxDQUFDLE9BQU8sT0FBTyxPQUFPO0lBRzFCLFlBQW9CLElBQW9CO1FBQXBCLFNBQUksR0FBSixJQUFJLENBQWdCO1FBSXhDLFFBQUcsR0FBRyxDQUFDLEdBQVcsRUFBRSxHQUFHLElBQWMsRUFBRSxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNoRCxPQUFPLElBQUksQ0FBQTtRQUNiLENBQUMsQ0FBQTtRQUNELFlBQU8sR0FBRyxDQUFDLE9BQTBDLEVBQUUsRUFBRTtZQUN2RCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDaEQsT0FBTyxJQUFJLENBQUE7UUFDYixDQUFDLENBQUE7UUFFRCxTQUFJLEdBQUcsS0FBSyxFQUFFLEdBQVcsRUFBRSxFQUFFO1lBQzNCLE1BQU0sSUFBSSxHQUFvQjtnQkFDNUIsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtnQkFDeEIsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSztnQkFDdEIsR0FBRzthQUNKLENBQUE7WUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFFbkMsSUFBSSxNQUFNLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDeEIsTUFBTSxLQUFLLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtpQkFDN0I7cUJBQU07b0JBQ0wsT0FBTyxDQUNMLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ2xELG1CQUFtQjt3QkFDbkIsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUMzQixrQkFBa0IsQ0FDckIsQ0FBQTtpQkFDRjthQUNGO1lBRUQsT0FBTTtRQUNSLENBQUMsQ0FBQTtRQW5DQyxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQTtJQUNqQixDQUFDO0NBbUNGIn0=