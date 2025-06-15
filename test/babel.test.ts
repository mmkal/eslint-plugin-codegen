import {test, expect} from 'vitest'
import {dependencies} from '../src/dependencies'
import {stripTypes} from '../src/presets/eval'

test('babel strip types', () => {
  const {dedent} = dependencies

  const typescriptCode = dedent`
    const fn: (a: string) => string = (a: string) => {
      type A = string
      interface B {}
      const f = <X extends string>(x: X) => [x] as const
      return a.slice(0, -1) as string
    }
  `

  expect(stripTypes(typescriptCode, dependencies)).toMatchInlineSnapshot(`
    "const fn = a => {
      const f = x => [x];
      return a.slice(0, -1);
    };"
  `)
})
