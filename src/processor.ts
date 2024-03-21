import type * as eslint from 'eslint'
import * as os from 'os'

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const eslintPluginMarkdownProcessor = require('eslint-plugin-markdown/lib/processor') as eslint.Linter.Processor

export const createProcessor = (): eslint.Linter.Processor => {
  return {
    preprocess: (text, filename) => [
      {
        filename: codegenMarkdownCommentedOutFile,
        text: text
          .split(/\r?\n/)
          .map(line => line && `// eslint-plugin-codegen:trim${line}`)
          .join(os.EOL),
      },
      ...eslintPluginMarkdownProcessor.preprocess!(text, filename),
    ],
    postprocess(messageLists, filename) {
      return [
        ...messageLists[0], // first one is the codegen-able file, the rest are from eslint-plugin-markdown
        ...eslintPluginMarkdownProcessor.postprocess!(messageLists.slice(1), filename),
      ]
    },
    supportsAutofix: true,
  }
}

const codegenMarkdownCommentedOutFile = `codegen-commented-out.js`
