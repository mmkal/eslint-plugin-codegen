import dedent from 'dedent'
import {test, expect, beforeEach} from 'vitest'
import * as preset from '../../src/presets/markdown-from-jsdoc'
import {buildPresetParams, getFakeFs} from './meta'

const {fs, mockFs, reset} = getFakeFs()

beforeEach(() => {
  reset()
})

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
      export const subtract = (a: number, b: number) => a - b

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

test('generate markdown with various types of exports', () => {
  Object.assign(mockFs, {
    [params.context.physicalFilename]: dedent`
      /** Configuration for a calculator */
      export type CalculatorOptions = {
        throwOnDivideByZero: boolean
      }

      /**
       * Does calculations
       * 
       * **Warning**: might not get it right.
       */
      export class Calculator {
        /** Create a new Calculator */
        constructor(readonly options: CalculatorOptions) {}

        /** Whether this calculator will throw on encountering a division by zero */
        get throwOnDivideByZero() {
          return this.options.throwOnDivideByZero
        }

        /** Adds a and b */
        add(a: number, b: number) {
          return a + b
        }

        /** Divides a and b */
        divide(a: number, b: number) {
          if (b === 0 && this.throwOnDivideByZero) throw new Error('Division by zero')
          return a / b
        }
      }

      /** Creates a calculator with default options */
      export function createCalculator() {
        return new Calculator({throwOnDivideByZero: false})
      }
    `,
  })

  expect(
    preset.markdownFromJsdoc({
      ...params,
      options: {source: 'index.ts'},
    }),
  ).toMatchInlineSnapshot(`
    "#### [CalculatorOptions](./index.ts#L2)

    Configuration for a calculator

    #### [Calculator](./index.ts#L11)

    Does calculations

    **Warning**: might not get it right.

    ##### [constructor](./index.ts#L13)

    Create a new Calculator

    ##### [throwOnDivideByZero](./index.ts#L16)

    Whether this calculator will throw on encountering a division by zero

    ##### [add](./index.ts#L21)

    Adds a and b

    ##### [divide](./index.ts#L26)

    Divides a and b

    #### [createCalculator](./index.ts#L33)

    Creates a calculator with default options"
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
