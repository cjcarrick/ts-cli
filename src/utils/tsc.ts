import { ESTargets, FileDescriptor, ModuleTypes, Runtimes } from '../utils'
import { format } from './prettier'

export default function tsc(
  target: Runtimes,
  module: ModuleTypes,
  esTarget: ESTargets
): FileDescriptor {
  let conf: any = {
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
  }

  Object.entries(conf.compilerOptions).forEach(
    ([key, prop]) => prop == undefined && delete conf.compilerOptions[key]
  )

  return [
    { name: 'tsconfig.json', contents: format(JSON.stringify(conf), 'json') }
  ]
}
