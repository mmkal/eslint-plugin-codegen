import baseDedent from 'dedent'
import {RuleTester} from 'eslint'
import * as os from 'os'
import {test} from 'vitest'
import * as codegen from '../src'

/** wrapper for dedent which respects os.EOL */
const dedent = (...args: Parameters<typeof baseDedent>) => {
  const result = baseDedent(...args)
  return result.replaceAll(/\r?\n/g, os.EOL)
}

Object.assign(RuleTester, {
  /* eslint-disable vitest/expect-expect, vitest/valid-title */
  // override RuleTester.it to improve test names passed to viteset
  it: (name: string, fn: any) => {
    test(name.replaceAll(/\r?\n/g, ' \\n ').trim(), fn)
  },
  /* eslint-enable vitest/expect-expect, vitest/valid-title */
})

// eslint-disable-next-line @typescript-eslint/unbound-method
const realToISOString = Date.prototype.toISOString
const initTimeIOSString = new Date().toISOString()
const notLongAgoTs = new Date(new Date(initTimeIOSString).getTime() - 60_000).toISOString()

Object.assign(Date.prototype, {
  toISOString() {
    const actualResult = realToISOString.call(this)
    if (new Date(actualResult).getTime() - new Date(initTimeIOSString).getTime() < 5000) {
      // give the test 5s to run - pretend it's instant if it's within 5s of the init time
      return initTimeIOSString
    }
    return actualResult
  },
})

// notes for debugging in future:
// for "valid" cases, the "expected" in failures is what the rule outputs, "received" is what we write here under `code`
// for "invalid" cases, the "expected" is what we write here under `output`, and "received" is what the rule outputs
// if you change anything in the cache tests, you'll probably need to update the cache `output` value. The plugin doesn't expose the hash of the "old" content, so you need to just add log statements, copy-paste the value, then delete the logs.

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
      name: 'custom preset cached recent timestamp',
      filename: __filename,
      code: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: centuryLogStatement}
        // codegen:hash {input: 0267cb42076f3316895be46a35454fdc, output: d48256c0a41c3b7396155e1054032719, timestamp: ${notLongAgoTs}}
        console.log('The century is: 20th')
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
      name: 'custom preset',
      filename: __filename,
      code: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: thrower}
        // codegen:end
      `,
      errors: [{message: /Error: test error!/}],
    },
    {
      name: 'custom preset add cache info',
      filename: __filename,
      code: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: centuryLogStatement}
        console.log('The century is: 21st')
        // codegen:end
      `,
      errors: [{message: /.*/}],
      output: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: centuryLogStatement}
        // codegen:hash {input: 0267cb42076f3316895be46a35454fdc, output: 7963286367c5f8f27d1baa9255f8d4d3, timestamp: ${initTimeIOSString}}
        console.log('The century is: 21st')
        // codegen:end
      `,
    },
    {
      name: 'custom preset cached old timestamp',
      filename: __filename,
      // note timestamp of hash is 1900, we only cache for 100 years so this is due an update
      code: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: centuryLogStatement}
        // codegen:hash {input: 0267cb42076f3316895be46a35454fdc, output: 7963286367c5f8f27d1baa9255f8d4d3, timestamp: 1900-01-01T00:00:00.000Z}
        console.log('The century is: 20th')
        // codegen:end
      `,
      errors: [{message: /.*/}],
      output: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: centuryLogStatement}
        // codegen:hash {input: 0267cb42076f3316895be46a35454fdc, output: 7963286367c5f8f27d1baa9255f8d4d3, timestamp: ${initTimeIOSString}}
        console.log('The century is: 21st')
        // codegen:end
      `,
    },
    {
      name: 'custom barrel',
      filename: __filename,
      code: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: customBarrel}
        // codegen:end
      `,
      errors: [{message: /content doesn't match:/}],
      output: dedent`
        // codegen:start {source: ./presets/custom-preset.cjs, export: customBarrel}
        Object.assign(module.exports, require('./plugin.test'))
        // codegen:end
      `,
    },
  ],
})
