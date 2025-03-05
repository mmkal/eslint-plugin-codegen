import dedent from 'dedent'
import * as glob from 'glob'
import * as jsYaml from 'js-yaml'
import minimatch from 'minimatch'
import {test, expect, beforeEach, vi} from 'vitest'
import * as preset from '../../src/presets/monorepo-toc'
import {buildPresetParams, getFakeFs} from './meta'

const {mockFs, fs, reset} = getFakeFs()

beforeEach(() => {
  reset()
})

vi.mock('glob')

vi.spyOn(glob, 'globSync').mockImplementation((pattern, opts) => {
  const found = Object.keys(mockFs).filter(k => minimatch(k, pattern as string))
  const ignores = typeof opts?.ignore === 'string' ? [opts?.ignore] : opts?.ignore || []
  return found.filter(f => (ignores as string[]).every(i => !minimatch(f, i)))
})

const params = buildPresetParams('readme.md', fs)

beforeEach(() => {
  Object.assign(mockFs, {
    'package.json': '{ "workspaces": ["packages/*"] }',

    'withBadWorkspaces/package.json': '{ "workspaces": "not an array!" }',

    'lerna.json': '{ "packages": ["packages/package1", "packages/package2"] }',

    'packages/package1/package.json':
      '{ "name": "package1", "description": "first package with an inline package.json description. Quite a long inline description, in fact." }',

    'packages/package2/package.json': '{ "name": "package2", "description": "package 2" }',
    'packages/package2/readme.md': dedent`
      # Package 2
      Readme for package 2
    `,

    'packages/package3/package.json': '{ "name": "package3", "description": "package 3" }',
    'packages/package3/readme.md': dedent`
      # Package 3
      Readme for package 3
    `,

    'packages/package4/package.json': '{ "name": "package4", "description": "fourth package" }',
    'packages/package4/README.md': dedent`
      # Package 4

      ## Subheading

      More details about package 4. Package 4 has a detailed readme, with multiple sections

      ### Sub-sub-heading

      Here's another section, with more markdown content in it.
    `,
  })
})

test('generate markdown', () => {
  expect(
    preset.monorepoTOC({
      ...params,
      options: {},
    }),
  ).toMatchInlineSnapshot(`
    "- [package1](./packages/package1) - first package with an inline package.json description. Quite a long inline description, in fact.
    - [package2](./packages/package2) - Readme for package 2
    - [package3](./packages/package3) - Readme for package 3
    - [package4](./packages/package4) - More details about package 4. Package 4 has a detailed readme, with multiple sections"
  `)
})

test('handle pnpm-workspace.yaml', () => {
  delete mockFs['lerna.json']
  mockFs['pnpm-workspace.yaml'] = jsYaml.dump({
    packages: 'packages/*',
  })
  expect(
    preset.monorepoTOC({
      ...params,
      options: {},
    }),
  ).toMatchInlineSnapshot(`
    "- [package1](./packages/package1) - first package with an inline package.json description. Quite a long inline description, in fact.
    - [package2](./packages/package2) - Readme for package 2
    - [package3](./packages/package3) - Readme for package 3
    - [package4](./packages/package4) - More details about package 4. Package 4 has a detailed readme, with multiple sections"
  `)
})

test('generate markdown with filter', () => {
  expect(
    preset.monorepoTOC({
      ...params,
      options: {filter: {'package.name': 'package1|package3'}},
    }),
  ).toMatchInlineSnapshot(`
    "- [package1](./packages/package1) - first package with an inline package.json description. Quite a long inline description, in fact.
    - [package3](./packages/package3) - Readme for package 3"
  `)
})

test('generate markdown with sorting', () => {
  expect(
    preset.monorepoTOC({
      ...params,
      options: {sort: '-readme.length'},
    }),
  ).toMatchInlineSnapshot(`
    "- [package4](./packages/package4) - More details about package 4. Package 4 has a detailed readme, with multiple sections
    - [package1](./packages/package1) - first package with an inline package.json description. Quite a long inline description, in fact.
    - [package2](./packages/package2) - Readme for package 2
    - [package3](./packages/package3) - Readme for package 3"
  `)
})

test('generate markdown default to lerna to find packages', () => {
  mockFs['package.json'] = '{}'
  expect(
    preset.monorepoTOC({
      ...params,
      options: {},
    }),
  ).toMatchInlineSnapshot(`
    "- [package1](./packages/package1) - first package with an inline package.json description. Quite a long inline description, in fact.
    - [package2](./packages/package2) - Readme for package 2"
  `)
})

test.skip('generate markdown fails when no package.json exists', () => {
  expect(() =>
    preset.monorepoTOC({
      ...buildPresetParams('subdir/test.md', fs),
      options: {},
    }),
  ).toThrow(/ENOENT: no such file or directory, open '.*subdir.*package.json'/)
})

test('generate markdown with separate rootDir', () => {
  expect(
    preset.monorepoTOC({
      ...buildPresetParams('subdir/test.md', fs),
      options: {repoRoot: '..'},
    }),
  ).toMatchInlineSnapshot(`
    "- [package1](../packages/package1) - first package with an inline package.json description. Quite a long inline description, in fact.
    - [package2](../packages/package2) - Readme for package 2
    - [package3](../packages/package3) - Readme for package 3
    - [package4](../packages/package4) - More details about package 4. Package 4 has a detailed readme, with multiple sections"
  `)
})

test('invalid workspaces', () => {
  Object.assign(mockFs, {
    'package.json': '{ "workspaces": "package.json - not an array" }',
    'lerna.json': '{ "packages": "lerna.json - not an array" }',
  })

  expect(() =>
    preset.monorepoTOC({
      ...params,
      options: {},
    }),
  ).toThrow(
    /Expected to find workspaces array from package.json, lerna.json or pnpm-workspace.yaml, got 'package.json - not an array'/,
  )
})

test('toplogical sort', () => {
  Object.keys(mockFs)
    .filter(k => k.includes('packages/'))
    .forEach(k => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete mockFs[k]
    })
  Object.assign(mockFs, {
    'packages/client/package.json': '{ "name": "client" }',
    'packages/schemainspect/package.json': '{ "name": "schemainspect", "dependencies": {"client": "*"} }',
    'packages/migra/package.json': '{ "name": "migra", "dependencies": {"client": "*", "schemainspect": "*"} }',
    'packages/migrator/package.json': '{ "name": "migrator", "dependencies": {"migra": "*", "client": "*"} }',
    'packages/typegen/package.json': '{ "name": "typegen", "dependencies": {"client": "*"} }',
    'packages/admin/package.json':
      '{ "name": "admin", "dependencies": {"client": "*", "schemainspect": "*", "migrator": "*"} }',
  })

  expect(
    preset.monorepoTOC({
      ...params,
      options: {
        sort: 'topological',
      },
    }),
  ).toMatchInlineSnapshot(`
    "- [client](./packages/client)
    - [schemainspect](./packages/schemainspect)
    - [typegen](./packages/typegen)
    - [migra](./packages/migra)
    - [migrator](./packages/migrator)
    - [admin](./packages/admin)"
  `)
})

test('toposort helper', () => {
  expect(
    preset.toposort({
      client: [],
      schemainspect: ['client'],
      migra: ['client', 'schemainspect'],
      migrator: ['migra', 'client'],
      typegen: ['client'],
      admin: ['client', 'schemainspect', 'migrator'],
    }),
  ).toMatchInlineSnapshot(`
    {
      "chunks": [
        [
          "client",
        ],
        [
          "schemainspect",
          "typegen",
        ],
        [
          "migra",
        ],
        [
          "migrator",
        ],
        [
          "admin",
        ],
      ],
      "cycles": [],
      "safe": true,
    }
  `)
})
