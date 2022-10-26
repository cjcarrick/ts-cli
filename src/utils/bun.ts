import { FileDescriptor } from './'
import { format } from './prettier'

export function bun(): FileDescriptor[] {
  return [
    {
      name: 'tsconfig.json',
      contents: format(
        JSON.stringify({
          compilerOptions: {
            lib: ['esnext'],
            module: 'esnext',
            target: 'esnext',
            moduleResolution: 'node',
            type: ['bun-types']
          }
        }),
        'json'
      )
    }
  ]
}
