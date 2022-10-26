import { format } from './prettier';
export function bun() {
    return [
        {
            name: 'tsconfig.json',
            contents: format(JSON.stringify({
                compilerOptions: {
                    lib: ['esnext'],
                    module: 'esnext',
                    target: 'esnext',
                    moduleResolution: 'node',
                    type: ['bun-types']
                }
            }), 'json')
        }
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2J1bi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRW5DLE1BQU0sVUFBVSxHQUFHO0lBQ2pCLE9BQU87UUFDTDtZQUNFLElBQUksRUFBRSxlQUFlO1lBQ3JCLFFBQVEsRUFBRSxNQUFNLENBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDYixlQUFlLEVBQUU7b0JBQ2YsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDO29CQUNmLE1BQU0sRUFBRSxRQUFRO29CQUNoQixNQUFNLEVBQUUsUUFBUTtvQkFDaEIsZ0JBQWdCLEVBQUUsTUFBTTtvQkFDeEIsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDO2lCQUNwQjthQUNGLENBQUMsRUFDRixNQUFNLENBQ1A7U0FDRjtLQUNGLENBQUE7QUFDSCxDQUFDIn0=