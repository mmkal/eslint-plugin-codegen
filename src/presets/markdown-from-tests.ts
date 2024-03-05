import type {Preset} from '.'
import {parse} from '@babel/parser'
import traverse from '@babel/traverse'
import * as fs from 'fs'
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
 * @param source the jest test file
 * @param headerLevel The number of `#` characters to prefix each title with
 */
export const markdownFromTests: Preset<{source: string; headerLevel?: number}> = ({meta, options}) => {
  const sourcePath = path.join(path.dirname(meta.filename), options.source)
  const sourceCode = fs.readFileSync(sourcePath).toString()
  const ast = parse(sourceCode, {sourceType: 'module', plugins: ['typescript']})
  const specs: Array<{title: string; preamble: string | undefined; code: string}> = []
  traverse(ast, {
    CallExpression(ce) {
      const identifier: any = lodash.get(ce, 'node')
      const isSpec = identifier && ['it', 'test'].includes(lodash.get(identifier, 'callee.name'))
      if (!isSpec) {
        return
      }

      const hasArgs =
        identifier.arguments.length >= 2 &&
        identifier.arguments[0].type === 'StringLiteral' &&
        identifier.arguments[1].body
      if (!hasArgs) {
        return
      }

      const preamble = ce.parent.leadingComments
        ?.flatMap(c => c.value)
        .join('\n')
        .split('\n') // split again because we just joined together some multiline strings
        .map(line => line.trim().replace(/^\*/, '').trim())
        .join('\n')
        .replaceAll('\n\n', '____DOUBLENEWLINE____')
        .replaceAll('\n', ' ')
        .replaceAll('____DOUBLENEWLINE____', '\n\n')
        ?.trim()

      const func = identifier.arguments[1]
      const lines = sourceCode.slice(func.start, func.end).split(/\r?\n/).slice(1, -1)
      const indent = lodash.min(lines.filter(Boolean).map(line => line.length - line.trim().length))!
      const body = lines.map(line => line.replace(' '.repeat(indent), '')).join('\n')
      specs.push({title: identifier.arguments[0].value, preamble, code: body})
    },
  })
  return specs
    .map(s => {
      const lines = [
        // eslint-disable-next-line mmkal/@typescript-eslint/restrict-template-expressions
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
