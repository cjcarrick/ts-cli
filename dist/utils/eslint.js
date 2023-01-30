import { format } from './prettier.js';
export default function eslintConfig(target) {
    const conf = `module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],${target == 'web'
        ? `env: {
      browser:true
    },`
        : `env: { 
      node:true 
    },`}
  root: true,
}`;
    return {
        name: '.eslintrc.cjs',
        contents: format(conf, 'js')
    };
}
export function eslintNodeDeclarator() {
    const conf = ` // Esbuild has to know that everything in here will be run in node

  module.exports={
    env: {
      node: true
    }
  }`;
    return {
        name: 'util/.eslintrc.cjs',
        contents: format(conf, 'js')
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNsaW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2VzbGludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBR3RDLE1BQU0sQ0FBQyxPQUFPLFVBQVUsWUFBWSxDQUFDLE1BQWdCO0lBQ25ELE1BQU0sSUFBSSxHQUFHOzs7b0NBSVgsTUFBTSxJQUFJLEtBQUs7UUFDYixDQUFDLENBQUM7O09BRUQ7UUFDRCxDQUFDLENBQUM7O09BR047O0VBRUEsQ0FBQTtJQUVBLE9BQU87UUFDTCxJQUFJLEVBQUUsZUFBZTtRQUNyQixRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7S0FDN0IsQ0FBQTtBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUsb0JBQW9CO0lBQ2xDLE1BQU0sSUFBSSxHQUFHOzs7Ozs7SUFNWCxDQUFBO0lBQ0YsT0FBTztRQUNMLElBQUksRUFBRSxvQkFBb0I7UUFDMUIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0tBQzdCLENBQUE7QUFDSCxDQUFDIn0=