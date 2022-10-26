import { format } from './prettier'
import { Runtimes, FileDescriptor } from '../utils'

export default function eslintConfig(target: Runtimes): FileDescriptor {
  const conf = `module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],${
    target == 'web'
      ? `env: {
      browser:true
    },`
      : `env: { 
      node:true 
    },`
  }
  root: true,
}`

  return {
    name: '.eslintrc.cjs',
    contents: format(conf, 'js')
  }
}

export function eslintNodeDeclarator(): FileDescriptor {
  const conf = ` // Esbuild has to know that everything in here will be run in node

  module.exports={
    env: {
      node: true
    }
  }`
  return {
    name: 'util/.eslintrc.cjs',
    contents: format(conf, 'js')
  }
}
