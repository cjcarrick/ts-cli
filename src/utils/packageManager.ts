import { PackageManagers, packageManagers } from '../utils/index.js'
import { cmdExists } from './scripts.js'

export default async function getPackageManagers() {
  let result: PackageManagers[] = []

  for (let i = 0; i < packageManagers.length; i++) {
    const manager = packageManagers[i]

    if (await cmdExists(manager)) {
      result.push(manager)
    }
  }

  return result
}
