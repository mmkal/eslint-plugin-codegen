import type * as eslint from 'eslint'
import * as os from 'os'
import * as path from 'path'

// eslint-disable-next-line mmkal/@typescript-eslint/no-var-requires, mmkal/@typescript-eslint/no-require-imports
const eslintPluginMarkdownProcessor: eslint.Linter.Processor = require('eslint-plugin-markdown/lib/processor')

export const createProcessor = (): eslint.Linter.Processor => {
  return {
    preprocess: (text, filename) => [
      ...eslintPluginMarkdownProcessor.preprocess!(text, filename),
      {
        filename: codegenMarkdownCommentedOutFile,
        text: text
          .split(/\r?\n/)
          .map(line => line && `// eslint-plugin-codegen:trim${line}`)
          .join(os.EOL),
      },
    ],
    postprocess(messageLists, filename) {
      if (path.basename(filename) === codegenMarkdownCommentedOutFile) {
        return messageLists.flat()
      }

      return eslintPluginMarkdownProcessor.postprocess!(messageLists, filename)
    },
    supportsAutofix: true,
  }
}

const codegenMarkdownCommentedOutFile = `codegen-commented-out.js`
