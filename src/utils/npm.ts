import { CoreProperties } from '@schemastore/package'
import { format } from './prettier'

export default class PackageJson {
  data: CoreProperties
  dependencies: { package: string; version?: string }[]
  devDependencies: { package: string; version?: string }[]

  constructor(name: string) {
    this.data = { name }
    this.dependencies = []
    this.devDependencies = []
  }

  toString = () => format(JSON.stringify(this.data), 'json')

  extend = (newData: CoreProperties) => {
    this.data = { ...this.data, ...newData }
    return this
  }

  dependency = (dep: string, version?: string) => {
    this.devDependencies.push({ package: dep, version })
    return this
  }

  devDependency = (dep: string, version?: string) => {
    this.devDependencies.push({ package: dep, version })
    return this
  }

  script = (name: string, script: string) => {
    if (!this.data.scripts) {
      this.data.scripts = {}
    }

    this.data.scripts[name] = script
    return this
  }
}

/** be sure that a package.json is already written at `cwd` */
export function installDeps(
  packageManager: string,
  packageJson: PackageJson
): { bin: string; args: string[] }[] {
  const dependencies = packageJson.dependencies.map(a =>
    a.version ? `${a.package}@${a.version}` : a.package
  )
  const devDependencies = packageJson.devDependencies.map(a =>
    a.version ? `${a.package}@${a.version}` : a.package
  )

  const result = []

  if (packageManager == 'pnpm') {
    if (devDependencies.length) {
      result.push({ bin: 'pnpm', args: ['add', '-D', ...devDependencies] })
    }
    if (dependencies.length) {
      result.push({ bin: 'pnpm', args: ['add', ...dependencies] })
    }
  } else if (packageManager == 'npm') {
    if (devDependencies.length) {
      result.push({ bin: 'npm', args: ['i', '-D', ...devDependencies] })
    }
    if (dependencies.length) {
      result.push({ bin: 'npm', args: ['i', ...dependencies] })
    }
  }

  return result
}
