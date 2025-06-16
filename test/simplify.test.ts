import * as recast from 'recast'
import {test, expect} from 'vitest'
import {PresetDependencies, dependencies} from '../src/dependencies'
import {simplifyCode, simplifyCodeTraverseOptions, stripTypes} from '../src/simplify'

test('simplifyCode', async () => {
  const {dedent} = dependencies

  const leftCode = dedent`
    import {foo} from 'bar'

    export const a: {foo: string} = {foo}
  `

  const rightCode = dedent`
    import {foo} from "bar"

    /** sup */
    export const a = {
      // hello
      "foo": foo,
    }
  `

  expect(simplifyCode(rightCode)).not.toContain(`"foo"`)
  expect(simplifyCode(rightCode)).not.toContain(`'foo'`)

  expect(simplifyCode(leftCode)).toMatchInlineSnapshot(`
    "import { foo } from 'bar';

    export const a = {
      foo,
    };"
  `)
  expect(simplifyCode(rightCode)).toMatchInlineSnapshot(`
    "import { foo } from 'bar';

    export const a = {
      foo,
    };"
  `)

  expect(simplifyCode(leftCode)).toBe(simplifyCode(rightCode))
})
