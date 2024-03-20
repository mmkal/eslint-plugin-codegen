import * as glob from 'glob'
import minimatch from 'minimatch'
import readPkgUp from 'read-pkg-up'
import * as preset from '../../src/presets/labeler'
import {buildPresetParams} from './meta'
import {test, expect, beforeEach, vi as jest} from 'vitest'

const mockFs: any = {}

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  Object.keys(mockFs).forEach(k => delete mockFs[k])
})

jest.mock('fs', async () => {
  const actual: any = await jest.importActual('fs')
  const reader =
    (orig: string) =>
    (...args: any[]) => {
      const path = args[0].replace(process.cwd() + '\\', '').replaceAll('\\', '/')
      // const fn = path in mockFs ? mockImpl : actual[orig]
      if (path in mockFs) {
        return mockFs[path]
      }

      return actual[orig](...args)
    }

  return {
    ...actual,
    readFileSync: reader('readFileSync'),
    existsSync: reader('existsSync'),
    readdirSync: (path: string) => Object.keys(mockFs).filter(k => k.startsWith(path.replace(/^\.\/?/, ''))),
    statSync: () => ({isFile: () => true, isDirectory: () => false}),
  }
})

jest.mock('glob')

jest.spyOn(glob, 'globSync').mockImplementation((pattern, opts) => {
  const found = Object.keys(mockFs).filter(k => minimatch(k, pattern as string))
  const ignores = typeof opts?.ignore === 'string' ? [opts?.ignore] : opts?.ignore || []
  return found.filter(f => (ignores as string[]).every(i => !minimatch(f, i)))
})

jest.mock('read-pkg-up')

jest.spyOn(readPkgUp, 'sync').mockImplementation(options =>
  Object.entries(mockFs)
    .map(([path, content]) => ({
      path,
      packageJson: JSON.parse(content as string),
    }))
    .find(p => options.cwd?.includes(p.path.replace('package.json', ''))),
)

beforeEach(() => {
  Object.assign(mockFs, {
    'package.json': '{ "workspaces": ["packages/*"] }',

    'packages/package1/package.json': '{ "name": "package1-aaa"}',
    'packages/package2/package.json': '{ "name": "package2-bbb"}',
    'packages/package3/package.json': '{ "name": "package3-ccc"}',
  })
})

test('generate labels', () => {
  expect(
    preset.labeler({
      ...buildPresetParams('.github/labeler.yml'),
      options: {},
    }),
  ).toMatchInlineSnapshot(`
    "package1-aaa:
      - packages/package1/**/*
    package2-bbb:
      - packages/package2/**/*
    package3-ccc:
      - packages/package3/**/*
    "
  `)
})
