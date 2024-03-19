import * as path from 'path'
import * as preset from '../../src/presets/custom'
import {buildPresetParams} from './meta'

const params = buildPresetParams(__filename)

jest.mock('ts-node/register/transpile-only')

test('custom preset validation', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const customPreset = require('./custom-preset')

  expect(Object.keys(customPreset)).toEqual(['getText', 'thrower'])

  expect(customPreset.getText.toString().trim()).toMatch(/'Named export with input: ' \+ options.input/)
})

test('named export', () => {
  expect(
    preset.custom({
      ...params,
      options: {source: './custom-preset.cjs', export: 'getText', input: 'abc'},
    }),
  ).toMatchInlineSnapshot(`"Named export with input: abc"`)
})

test('whole module export', () => {
  expect(
    preset.custom({
      ...params,
      options: {source: './custom-preset.cjs', input: 'def'},
    }),
  ).toMatchInlineSnapshot(`"Whole module export with input: def"`)
})

test('load typescript with ts-node', () => {
  expect(
    preset.custom({
      ...params,
      options: {source: './custom-preset.ts', export: 'getText'},
    }),
  ).toMatchInlineSnapshot(`"typescript text"`)
})

test('dev mode, deletes require cache', () => {
  expect(
    preset.custom({
      ...params,
      options: {source: './custom-preset.cjs', input: 'ghi', dev: true},
    }),
  ).toMatchInlineSnapshot(`"Whole module export with input: ghi"`)
})

test(`when source isn't specified, uses filename`, () => {
  expect(
    preset.custom({
      ...params,
      meta: {...params.meta, filename: path.join(__dirname, 'custom-preset.cjs')},
      options: {input: 'abc'},
    }),
  ).toEqual('Whole module export with input: abc')
})

test('errors for non-existent source file', () => {
  expect(() =>
    preset.custom({
      ...params,
      options: {source: './does-not-exist.ts'},
    }),
  ).toThrow(/Source path is not a file: .*does-not-exist.ts/)
})

test('errors if directory passed as source', () => {
  expect(() =>
    preset.custom({
      ...params,
      options: {source: '__tests__'},
    }),
  ).toThrow(/Source path is not a file: .*__tests__/)
})

test('errors for non-existent export', () => {
  expect(() =>
    preset.custom({
      ...params,
      options: {source: './custom-preset.cjs', export: 'doesNotExist', input: 'abc'},
    }),
  ).toThrow(/Couldn't find export doesNotExist from .*custom-preset.cjs - got undefined/)
})

test('errors for export with wrong type', () => {
  expect(() =>
    preset.custom({
      ...params,
      options: {source: './invalid-custom-preset.cjs', input: 'abc'},
    }),
  ).toThrow(/Couldn't find export function from .*invalid-custom-preset.cjs - got object/)
})

test('can require module first', () => {
  expect(() =>
    preset.custom({
      ...params,
      options: {source: './custom-preset.cjs', require: 'thismoduledoesnotexist'},
    }),
  ).toThrow(/Cannot find module 'thismoduledoesnotexist' from 'src\/presets\/custom.ts'/)
})
