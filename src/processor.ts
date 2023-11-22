import type * as eslint from 'eslint'
import * as os from 'os'

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
      const shouldProcessHere = (message: eslint.Linter.LintMessage) => {
        return message.ruleId?.endsWith('codegen/codegen') || message.fatal
      }

      const messageListsToProcessWithoutMarkdownPlugin = messageLists
        .map(list => list.filter(rule => shouldProcessHere(rule)))
        .filter(list => list.length)

      const messageListsToProcessWithMarkdownPlugin = messageLists
        .map(list => list.filter(rule => !shouldProcessHere(rule)))
        .filter(list => list.length)

      return [
        ...eslintPluginMarkdownProcessor.postprocess!(messageListsToProcessWithMarkdownPlugin, filename),
        ...messageListsToProcessWithoutMarkdownPlugin.flat(),
      ]
    },
    supportsAutofix: true,
  }
}

const codegenMarkdownCommentedOutFile = `codegen-commented-out.js`
