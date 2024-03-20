import dedent from 'dedent'
import {test, expect, beforeEach} from 'vitest'
import * as preset from '../../src/presets/markdown-from-jsdoc'
import {buildPresetParams} from './meta'

const mockFs: any = {}

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  Object.keys(mockFs).forEach(k => delete mockFs[k])
})

const fs = (() => {
  const actual: any = require('fs')
  const reader =
    (orig: string) =>
    (...args: any[]) => {
      const filepath = args[0].replaceAll('\\', '/')
      if (filepath in mockFs) {
        return mockFs[filepath]
      }

      try {
        return actual[orig](...args)
      } catch (e) {
        throw new Error(
          `Failed calling ${orig} with args ${JSON.stringify(args)}: ${e}. Mock fs: ${JSON.stringify(
            mockFs,
            null,
            2,
          )}}`,
        )
      }
    }

  return {
    ...actual,
    readFileSync: reader('readFileSync'),
    existsSync: reader('existsSync'),
    readdirSync: (path: string) => Object.keys(mockFs).filter(k => k.startsWith(path.replace(/^\.\/?/, ''))),
    statSync: () => ({isFile: () => true, isDirectory: () => false}),
  } as typeof import('fs')
})()

const params = buildPresetParams(__dirname + '/index.ts', fs)

test('generate markdown', () => {
  Object.assign(mockFs, {
    [params.context.physicalFilename]: dedent`
      /**
       * Adds two numbers
       *
       * @example const example1 = fn(1, 2) // returns 3
       *
       * @description Uses js \`+\` operator
       *
       * @example const example1 = fn(1, 20) // returns 21
       *
       * @see subtract for the converse
       *
       * @link http://google.com has a calculator in it too
       *
       * @param a {number} the first number
       * @param b {number} the second number
       */
      export const add = (a: number, b: number) => a + b

      /**
       * Subtracts two numbers
       *
       * @example const example1 = subtract(5, 3) // returns 2
       *
       * @description Uses js \`-\` operator
       *
       * @param a {number} the first number
       * @param b {number} the second number
       */
      export const add = (a: number, b: number) => a - b

      /**
       * @param a
       * @param b
       * multi-line description
       * for 'b'
       */
      export const multiply = (a: number, b: number) => a * b
    `,
  })

  expect(
    preset.markdownFromJsdoc({
      ...params,
      options: {source: 'index.ts', export: 'add'},
    }),
  ).toMatchInlineSnapshot(`
    "#### [add](./index.ts#L17)

    Adds two numbers

    ##### Example

    \`\`\`typescript
    const example1 = fn(1, 2) // returns 3
    \`\`\`

    Uses js \`+\` operator

    ##### Example

    \`\`\`typescript
    const example1 = fn(1, 20) // returns 21
    \`\`\`

    ##### Link

    http://google.com has a calculator in it too

    ##### Params

    |name|description               |
    |----|--------------------------|
    |a   |{number} the first number |
    |b   |{number} the second number|"
  `)

  expect(
    preset.markdownFromJsdoc({
      ...params,
      options: {source: 'index.ts', export: 'multiply'},
    }),
  ).toMatchInlineSnapshot(`
    "#### [multiply](./index.ts#L37)

    ##### Params

    |name|description                        |
    |----|-----------------------------------|
    |a   |                                   |
    |b   |multi-line description<br />for 'b'|"
  `)
})

test('not found export', () => {
  Object.assign(mockFs, {
    [params.context.physicalFilename]: dedent`
      /** docs */
      export const add = (a: number, b: number) => a + b
    `,
  })

  expect(() =>
    preset.markdownFromJsdoc({
      ...params,
      options: {source: 'index.ts', export: 'subtract'},
    }),
  ).toThrow(/Couldn't find export in .*index.ts with jsdoc called subtract/)
})
