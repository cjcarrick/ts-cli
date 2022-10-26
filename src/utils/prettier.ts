import prettier, { RequiredOptions as PrettierConfig } from 'prettier'

export const prettierConfig: Partial<PrettierConfig> = {
  semi: false,
  singleQuote: true,
  useTabs: false,
  tabWidth: 2,
  trailingComma: 'none',
  printWidth: 80,
  arrowParens: 'avoid',
}

export const format = (src: string, fileExtension: string) => {
  const formatted = prettier.format(src, {
    ...prettierConfig,
    filepath: `file.${fileExtension}`
  })

  return formatted
}
