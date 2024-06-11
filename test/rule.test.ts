import baseDedent from 'dedent'
import {RuleTester} from 'eslint'
import * as os from 'os'
import * as path from 'path'
import {beforeEach} from 'vitest'
import {test} from 'vitest'
import * as codegen from '../src'

/** wrapper for dedent which respects os.EOL */
const dedent = (...args: Parameters<typeof baseDedent>) => {
  const result = baseDedent(...args)
  return result.replaceAll(/\r?\n/g, os.EOL)
}

Object.assign(RuleTester, {
  /* eslint-disable vitest/expect-expect, vitest/valid-title */
  it: (name: string, fn: any) => {
    test(name.replaceAll(/\r?\n/g, ' \\n ').trim(), fn)
  },
  /* eslint-enable vitest/expect-expect, vitest/valid-title */
})

const ts = new Date().toISOString()

beforeEach(() => {
  Object.assign(Date.prototype, {toISOString: () => ts}) // freeze time to avoid flaky tests, even if they take >1ms to run
})

const tester = new RuleTester()
tester.run('codegen', codegen.rules.codegen, {
  valid: [
    {
      name: 'empty file',
      filename: 'index.ts',
      code: '',
    },
    {
      name: 'empty preset',
      filename: __filename,
      code: dedent`
        // codegen:start {preset: empty}
        // codegen:end
      `,
    },
    {
      name: 'barrel preset',
      filename: path.join(__dirname, 'fixtures/barrel/barrel.ts'),
      parserOptions: {ecmaVersion: 2015, sourceType: 'module'},
      code: dedent`
        // codegen:start {preset: barrel}
        export * from './bar'
        export * from './foo'
        // codegen:end
      `,
    },
    {
      name: 'custom preset cached recent timestamp',
      filename: __filename,
      code: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: centuryLogStatement}
        // codegen:hash {input: 6c4faf277969ea604df6aa4215a40741, output: adb11f34a780fc80aa7d7f69f0a5f4c5, timestamp: 2000-01-01T00:00:00.000Z}
        console.log('century: 20th')
        // codegen:end
      `,
    },
  ],
  invalid: [
    {
      name: 'missing end marker',
      filename: 'index.ts',
      code: dedent`
        // codegen:start {preset: barrel}
      `,
      errors: [{message: `couldn't find end marker (expected regex /\\/\\/ codegen:end/g)`}],
      output: dedent`
        // codegen:start {preset: barrel}
        // codegen:end
      `,
    },
    {
      name: 'non-existent preset',
      filename: __filename,
      code: dedent`
        // codegen:start {preset: doesNotExist}
        // codegen:end
      `,
      errors: [{message: /unknown preset doesNotExist. Available presets: .*/}],
    },
    {
      name: 'invalid yaml',
      filename: __filename,
      code: dedent`
        // codegen:start {abc: !Tag: not valid yaml!}
        // codegen:end
      `,
      errors: [{message: /Error parsing options. YAMLException/}],
    },
    {
      name: 'duplicate start markers',
      filename: __filename,
      code: dedent`
        // codegen:start {preset: empty}
        // codegen:start {preset: empty}
        // codegen:end
      `,
      errors: [{message: /couldn't find end marker/}],
      output: dedent`
        // codegen:start {preset: empty}
        // codegen:end
        // codegen:start {preset: empty}
        // codegen:end
      `,
    },
    {
      name: 'barrel preset fix',
      filename: path.join(__dirname, 'fixtures/barrel/barrel.ts'),
      parserOptions: {ecmaVersion: 2015, sourceType: 'module'},
      code: dedent`
        // codegen:start {preset: barrel}
        // codegen:end
      `,
      errors: [{message: /content doesn't match/}],
      output: dedent`
        // codegen:start {preset: barrel}
        export * from './bar'
        export * from './foo'
        // codegen:end
      `,
    },
    {
      name: 'custom preset',
      filename: __filename,
      code: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: thrower}
        // codegen:end
      `,
      errors: [{message: /Error: test error!/}],
    },
    {
      name: 'custom preset cached fix',
      filename: __filename,
      code: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: centuryLogStatement}
        console.log('century: 20th')
        // codegen:end
      `,
      errors: [{message: /.*/}],
      output: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: centuryLogStatement}
        // codegen:hash {input: 6c4faf277969ea604df6aa4215a40741, output: adb11f34a780fc80aa7d7f69f0a5f4c5, timestamp: ${ts}}
        console.log('century: 20th')
        // codegen:end
      `,
    },
    {
      name: 'custom preset cached old timestamp',
      filename: __filename,
      // note timestamp of hash is 1900, we only cache for 100 years so this is due an update
      code: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: centuryLogStatement}
        // codegen:hash {input: 6c4faf277969ea604df6aa4215a40741, output: adb11f34a780fc80aa7d7f69f0a5f4c5, timestamp: 1900-01-01T00:00:00.000Z}
        console.log('century: 20th')
        // codegen:end
      `,
      errors: [{message: /.*/}],
      output: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: centuryLogStatement}
        // codegen:hash {input: 6c4faf277969ea604df6aa4215a40741, output: adb11f34a780fc80aa7d7f69f0a5f4c5, timestamp: ${ts}}
        console.log('century: 20th')
        // codegen:end
      `,
    },
  ],
})
