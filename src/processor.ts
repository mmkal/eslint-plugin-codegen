import type * as eslint from 'eslint'
import * as os from 'os'
import * as path from 'path'

// eslint-disable-next-line mmkal/@typescript-eslint/no-var-requires, mmkal/@typescript-eslint/no-require-imports
const eslintPluginMarkdownProcessor: eslint.Linter.Processor = require('eslint-plugin-markdown/lib/processor')

export const createProcessor = <Ext extends `.${string}`>(ext: Ext): eslint.Linter.Processor => {
  return {
    preprocess: (text, filename) => [
      ...eslintPluginMarkdownProcessor.preprocess!(text, filename),
      {
        filename: codegenMarkdownCommentedOutFile(ext),
        text: text
          .split(/\r?\n/)
          .map(line => line && `// eslint-plugin-codegen:trim${line}`)
          .join(os.EOL),
      },
    ],
    postprocess(messageLists, filename) {
      const file = path.parse(filename)
      if (file.ext === '.md' && file.base !== codegenMarkdownCommentedOutFile(ext)) {
        return eslintPluginMarkdownProcessor.postprocess!(messageLists, filename)
      }

      return messageLists.flat()
    },
    supportsAutofix: true,
  }
}

const codegenMarkdownCommentedOutFile = <Ext extends `.${string}`>(ext: Ext) => `codegen-commented-out${ext}.js`
