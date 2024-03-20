import dedent from 'dedent'
import {test, expect, beforeEach} from 'vitest'
import * as preset from '../../src/presets/markdown-from-tests'
import {buildPresetParams, getFakeFs} from './meta'

const {fs, mockFs, reset} = getFakeFs()

beforeEach(() => {
  reset()
})

const params = buildPresetParams(__dirname + '/test.ts', fs)

test('generate markdown', () => {
  Object.assign(mockFs, {
    [params.context.physicalFilename]: dedent`
      import {calculator} from '..'

      beforeEach(() => {
        calculator.setup()
      })

      test('addition', () => {
        expect(calculator.add(1, 1)).toEqual(2)
      })

      it('subtraction', () => {
        expect(calculator.subtract(1, 1)).toEqual(0)
      })

      const nonLiteralTestName = 'also subtraction'
      it(nonLiteralTestName, () => {
        expect(calculator.subtract(1, 1)).toEqual(0)
      })

      /**
       * multiplication is
       * like addition but _more so_.
       */
      // The following works, but is not recommended, it's too dangerous. Stick to adding instead if possible.
      test('multiplication', () => {
        expect(calculator.multiply(2, 3)).toEqual(6)
      })

      /**
       * dividing numbers is an advanced use case
       * 
       * Note that javascript can do weird things with floats.
       */
      test('division', () => {
        expect(calculator.divide(1, 2)).toEqual(0.5)
      })

      test.skip('division by zero', () => {
        expect(calculator.divide(1, 0)).toEqual(Infinity)
      })
    `,
  })

  const withHeaders = preset.markdownFromTests({
    ...params,
    options: {source: 'test.ts', headerLevel: 4},
  })
  expect(withHeaders).toMatchInlineSnapshot(`
    "#### addition

    \`\`\`typescript
    expect(calculator.add(1, 1)).toEqual(2)
    \`\`\`

    #### subtraction

    \`\`\`typescript
    expect(calculator.subtract(1, 1)).toEqual(0)
    \`\`\`

    #### multiplication

    multiplication is like addition but _more so_.

    The following works, but is not recommended, it's too dangerous. Stick to adding instead if possible.

    \`\`\`typescript
    expect(calculator.multiply(2, 3)).toEqual(6)
    \`\`\`

    #### division

    dividing numbers is an advanced use case

    Note that javascript can do weird things with floats.

    \`\`\`typescript
    expect(calculator.divide(1, 2)).toEqual(0.5)
    \`\`\`"
  `)
  const withoutHeaders = preset.markdownFromTests({
    ...params,
    options: {source: 'test.ts'},
  })

  expect(withoutHeaders).toEqual(withHeaders.replaceAll(/#### (.*)/g, '$1:'))
})
