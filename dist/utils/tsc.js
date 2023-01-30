import { format } from './prettier.js';
export default function tsc(target, module, esTarget) {
    let conf = {
        compilerOptions: {
            target: esTarget,
            module,
            strict: true,
            inlineSourceMap: true,
            outDir: 'dist',
            esModuleInterop: true,
            lib: target == 'web' ? ['dom'] : [],
            moduleResolution: 'node'
        },
        files: ['src/index.ts']
    };
    Object.entries(conf.compilerOptions).forEach(([key, prop]) => prop == undefined && delete conf.compilerOptions[key]);
    return [
        { name: 'tsconfig.json', contents: format(JSON.stringify(conf), 'json') }
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3RzYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBRXRDLE1BQU0sQ0FBQyxPQUFPLFVBQVUsR0FBRyxDQUN6QixNQUFnQixFQUNoQixNQUFtQixFQUNuQixRQUFtQjtJQUVuQixJQUFJLElBQUksR0FBUTtRQUNkLGVBQWUsRUFBRTtZQUNmLE1BQU0sRUFBRSxRQUFRO1lBQ2hCLE1BQU07WUFDTixNQUFNLEVBQUUsSUFBSTtZQUNaLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLE1BQU0sRUFBRSxNQUFNO1lBQ2QsZUFBZSxFQUFFLElBQUk7WUFDckIsR0FBRyxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDbkMsZ0JBQWdCLEVBQUUsTUFBTTtTQUN6QjtRQUNELEtBQUssRUFBRSxDQUFDLGNBQWMsQ0FBQztLQUN4QixDQUFBO0lBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxDQUMxQyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksU0FBUyxJQUFJLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FDdkUsQ0FBQTtJQUVELE9BQU87UUFDTCxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxFQUFFO0tBQzFFLENBQUE7QUFDSCxDQUFDIn0=