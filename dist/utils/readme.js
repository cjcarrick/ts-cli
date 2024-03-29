import { format } from './prettier.js';
export default function readme(packageJson, args) {
    let markdown = `
# ${packageJson.name}

##### Generated by (ts-cli)[https://www.github.com/cjcarrick/ts-cli], a simlpe TypeScript app scaffolding tool created with the following parameters:
- Runtime: **${args.runtime}**
- Build tool: **${args.buildTool}**
- ES Targets: **${args.esTarget}**
- Module type: **${packageJson.type == 'module' ? 'ESM' : 'CommonJS'}**
- Package Manager: **${args.packageManager}**
- Scripts will have **source maps** enabled, beacuse of the \`--enable-source-maps\` flag in the ${packageJson.scripts?.ev
        ? `\`start\` and \`dev\` scripts`
        : `\`start\` script`} and becuase the generated \`${args.buildTool}\` config is set to generate inline source maps.

### Building

\`\`\`sh
${args.packageManager} ${args.packageManager == 'npm' ? 'run ' : ''}${'build'}
\`\`\`

### Watching

\`\`\`sh
${args.packageManager} ${args.packageManager == 'npm' ? 'run ' : ''}${'watch'}
\`\`\`

### Running
\`\`\`sh
${args.packageManager} ${args.packageManager == 'npm' ? 'run ' : ''}${'start'}
\`\`\`
`;
    if (packageJson.scripts?.dev) {
        markdown += `
### Running for Development
\`\`\`sh
${args.packageManager} ${args.packageManager == 'npm' ? 'run ' : ''}${'dev'}
\`\`\`
`;
    }
    const importExamples = {
        esm: `
\`\`\`typescript
// index.ts
import { foo } from './namedExport'
import FooBar from './defaultExport'
import TheDefault, { foo2 } from './both'


// namedExport.ts
export const foo = 'string'


// defaultExport.ts
export default function FooBar() {
return 'value'
}


// both.ts
export const foo2 = 'string'

export default function FooBar() {
return 'value'
}
\`\`\`
`,
        commonjs: `
\`\`\`typescript
// index.ts
const imported = require('./singleExport.ts')
console.log(imported)
// prints: 'string'


// singleExport.ts
cosnt foo = 'string'

module.exports = foo


// index.ts
const { foo, bar } = require('./modules.ts')
console.log(foo, bar)
// prints: 'string another'


// multipleExports.ts
const foo = 'string'
const bar = 'another'

modul.exports = { foo, bar }
\`\`\`
`
    };
    if (args.buildTool == 'esbuild') {
        markdown += `
## Modules

ESBuild works best with ES modules, which have been enabled by default for this project. Use them like this:

${importExamples.esm}

`;
        if (args.bundleModules) {
            markdown += `
*ESBuild was also configured to bundle all modules into one file.*
`;
        }
    }
    else if (args.buildTool == 'tsc') {
        markdown += ` ## Modules

TSC works with ESM modules and CommonJS modules.`;
        if (packageJson.type == 'modules') {
            markdown += ` This project was configured to use ESM. So, use local modules like this:

${importExamples.esm}

Notice that no \`.ts\` or \`.js\` extension is present on the imports. TSC will omit the extension after transpilation as well. Normally, this is a problem because when you run the script with Node, Node won't be able to locate the files. 

For this reason, sometimes people append \`.js\` extensions to their imports. The \`.js\` extension is preserved after transpilation, and both the imports and type checking works just fine.

However, for cleaner code, the \`--modules-resolution=node\` flag has been given to the \`start\` ${packageJson.scripts?.dev ? 'and `dev` scripts' : 'script'}. In short, this tells Node to try and append a \`.js\` extension to imports.
`;
        }
        else {
            markdown += ` This project was configured to use CommonJS. So, use local modules like this:
${importExamples.commonjs}

      `;
        }
    }
    return format(markdown, 'md');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhZG1lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3JlYWRtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBR3RDLE1BQU0sQ0FBQyxPQUFPLFVBQVUsTUFBTSxDQUFDLFdBQTJCLEVBQUUsSUFBWTtJQUN0RSxJQUFJLFFBQVEsR0FBRztJQUNiLFdBQVcsQ0FBQyxJQUFJOzs7ZUFHTCxJQUFJLENBQUMsT0FBTztrQkFDVCxJQUFJLENBQUMsU0FBUztrQkFDZCxJQUFJLENBQUMsUUFBUTttQkFDWixXQUFXLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVO3VCQUM3QyxJQUFJLENBQUMsY0FBYzttR0FFdEMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ3JCLENBQUMsQ0FBQywrQkFBK0I7UUFDakMsQ0FBQyxDQUFDLGtCQUNOLGdDQUNFLElBQUksQ0FBQyxTQUNQOzs7OztFQUtBLElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLGNBQWMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLE9BQU87Ozs7OztFQU0zRSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxjQUFjLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxPQUFPOzs7OztFQUszRSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxjQUFjLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxPQUFPOztDQUU1RSxDQUFBO0lBRUMsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUM1QixRQUFRLElBQUk7OztFQUdkLElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLGNBQWMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEtBQUs7O0NBRTFFLENBQUE7S0FDRTtJQUVELE1BQU0sY0FBYyxHQUFHO1FBQ3JCLEdBQUcsRUFBRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQXlCUjtRQUNHLFFBQVEsRUFBRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0EwQmI7S0FDRSxDQUFBO0lBRUQsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLFNBQVMsRUFBRTtRQUMvQixRQUFRLElBQUk7Ozs7O0VBS2QsY0FBYyxDQUFDLEdBQUc7O0NBRW5CLENBQUE7UUFDRyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDdEIsUUFBUSxJQUFJOztDQUVqQixDQUFBO1NBQ0k7S0FDRjtTQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxLQUFLLEVBQUU7UUFDbEMsUUFBUSxJQUFJOztpREFFaUMsQ0FBQTtRQUU3QyxJQUFJLFdBQVcsQ0FBQyxJQUFJLElBQUksU0FBUyxFQUFFO1lBQ2pDLFFBQVEsSUFBSTs7RUFFaEIsY0FBYyxDQUFDLEdBQUc7Ozs7OztvR0FPWixXQUFXLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLFFBQ25EO0NBQ0wsQ0FBQTtTQUNJO2FBQU07WUFDTCxRQUFRLElBQUk7RUFDaEIsY0FBYyxDQUFDLFFBQVE7O09BRWxCLENBQUE7U0FDRjtLQUNGO0lBQ0QsT0FBTyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO0FBQy9CLENBQUMifQ==