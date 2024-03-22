import type {Preset} from '.'
import {parse} from '@babel/parser'
import traverse from '@babel/traverse'
import * as lodash from 'lodash'
import * as path from 'path'

/**
 * Use a test file to generate library usage documentation.
 *
 * Note: this has been tested with vitest and jest. It _might_ also work fine with mocha, and maybe ava, but those haven't been tested.
 *
 * JSDoc/inline comments above tests will be added as a "preamble", making this a decent way to quickly document API usage of a library,
 * and to be sure that the usage is real and accurate.
 *
 * ##### Example
 *
 * `<!-- codegen:start {preset: markdownFromTests, source: test/foo.test.ts, headerLevel: 3} -->`
 *
 * @param source the test file
 * @param include if defined, only tests with titles matching one of these regexes will be included
 * @param exclude if defined, tests with titles matching one of these regexes will be excluded
 * @param headerLevel The number of `#` characters to prefix each title with
 * @param includeEslintDisableDirectives If true, `// eslint-disable ...` type comments will be included in the preamble. @default false
 */
export const markdownFromTests: Preset<{
  source: string
  headerLevel?: number
  include?: string[]
  exclude?: string[]
  includeEslintDisableDirectives?: boolean
}> = ({meta, options, dependencies: {fs}}) => {
  const sourcePath = path.join(path.dirname(meta.filename), options.source)
  const sourceCode = fs.readFileSync(sourcePath).toString()
  const ast = parse(sourceCode, {sourceType: 'module', plugins: ['typescript']})
  const specs: Array<{title: string; preamble: string | undefined; code: string}> = []
  traverse(ast, {
    CallExpression(ce) {
      const identifier = ce?.node
      const isSpec = identifier && ['it', 'test'].includes(lodash.get<{}, string>(identifier, 'callee.name') as string)
      if (!isSpec) {
        return
      }

      const [title, fn] = identifier.arguments
      const hasArgs = title && fn && title.type === 'StringLiteral' && 'body' in fn && fn.body
      if (!hasArgs) {
        return
      }

      if (options.include && !options.include.some(regex => new RegExp(regex).test(title.value))) {
        return
      }

      if (options.exclude?.some(regex => new RegExp(regex).test(title.value))) {
        return
      }

      const preamble = ce.parent.leadingComments
        ?.flatMap(c => c.value)
        .filter(line => options.includeEslintDisableDirectives || !line.includes('eslint-disable')) // remove eslint-disable directives
        .join('\n')
        .split('\n') // split again because we just joined together some multiline strings
        .map(line => line.trim().replace(/^\*/, '').trim())
        .join('\n')
        .replaceAll('\n\n', '____DOUBLENEWLINE____')
        .replaceAll('\n', ' ')
        .replaceAll('____DOUBLENEWLINE____', '\n\n')
        ?.trim()

      const func = fn
      const lines = sourceCode.slice(fn.start!, func.end!).split(/\r?\n/).slice(1, -1)
      const indent = lodash.min(lines.filter(Boolean).map(line => line.length - line.trim().length))!
      const body = lines.map(line => line.replace(' '.repeat(indent), '')).join('\n')
      specs.push({title: title.value, preamble, code: body})
    },
  })
  return specs
    .map(s => {
      const lines = [
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${'#'.repeat(options.headerLevel || 0)} ${s.title}${options.headerLevel ? '' : ':'}${'\n'}`.trimStart(),
        ...(s.preamble ? [s.preamble, ''] : []),
        '```typescript',
        s.code,
        '```',
      ]
      return lines.join('\n').trim()
    })
    .join('\n\n')
}
