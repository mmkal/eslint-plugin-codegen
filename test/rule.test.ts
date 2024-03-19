import baseDedent from 'dedent'
import {RuleTester} from 'eslint'
import * as os from 'os'
import * as codegen from '../src'

jest.mock('glob', () => ({
  globSync: () => ['foo.ts', 'bar.ts'],
}))

/** wrapper for dedent which respects os.EOL */
const dedent = (...args: Parameters<typeof baseDedent>) => {
  const result = baseDedent(...args)
  return result.replaceAll(/\r?\n/g, os.EOL)
}

Object.assign(RuleTester, {
  /* eslint-disable jest/expect-expect, jest/valid-title */
  it: (name: string, fn: any) => {
    test(name.replaceAll(/\r?\n/g, ' \\n ').trim(), fn)
  },
  /* eslint-enable jest/expect-expect, jest/valid-title */
})

const tester = new RuleTester()
tester.run('codegen', codegen.rules.codegen, {
  valid: [
    {
      filename: 'index.ts',
      code: '',
    },
    {
      filename: __filename,
      code: dedent`
        // codegen:start {preset: empty}
        // codegen:end
      `,
    },
  ],
  invalid: [
    {
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
      filename: __filename,
      code: dedent`
        // codegen:start ""
        // codegen:end
      `,
      errors: [{message: /unknown preset undefined./}],
    },
    {
      filename: __filename,
      code: dedent`
        // codegen:start {preset: doesNotExist}
        // codegen:end
      `,
      errors: [{message: /unknown preset doesNotExist. Available presets: .*/}],
    },
    {
      filename: __filename,
      code: dedent`
        // codegen:start {abc: !Tag: not valid yaml!}
        // codegen:end
      `,
      errors: [{message: /Error parsing options. YAMLException/}],
    },
    {
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
      filename: __filename,
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
      filename: __filename,
      code: dedent`
        // codegen:start {preset: custom, source: ./presets/custom-preset.cjs, export: thrower}
        // codegen:end
      `,
      errors: [{message: /Error: test error!/}],
    },
  ],
})
