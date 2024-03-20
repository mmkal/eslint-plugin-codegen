import * as glob from 'glob'
import minimatch from 'minimatch'
import * as path from 'path'
import readPkgUp from 'read-pkg-up'
import {test, expect, beforeEach, vi as jest} from 'vitest'
import * as preset from '../../src/presets/labeler'
import {buildPresetParams} from './meta'

const mockFs: any = {}

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  Object.keys(mockFs).forEach(k => delete mockFs[k])
})

const fs = (() => {
  const actual: any = require('fs')
  const reader =
    (orig: string) =>
    (...args: any[]) => {
      const filepath = path.relative(process.cwd(), args[0])
      // const fn = path in mockFs ? mockImpl : actual[orig]
      if (filepath in mockFs) {
        return mockFs[filepath]
      }

      return actual[orig](...args)
    }

  return {
    ...actual,
    readFileSync: reader('readFileSync'),
    existsSync: reader('existsSync'),
    readdirSync: (filepath: string) => Object.keys(mockFs).filter(k => k.startsWith(filepath.replace(/^\.\/?/, ''))),
    statSync: () => ({isFile: () => true, isDirectory: () => false}),
  }
})()

jest.mock('glob')

jest.spyOn(glob, 'globSync').mockImplementation((pattern, opts) => {
  const found = Object.keys(mockFs).filter(k => minimatch(k, pattern as string))
  const ignores = typeof opts?.ignore === 'string' ? [opts?.ignore] : opts?.ignore || []
  return found.filter(f => (ignores as string[]).every(i => !minimatch(f, i)))
})

jest.mock('read-pkg-up')

jest.spyOn(readPkgUp, 'sync').mockImplementation(options =>
  Object.entries(mockFs)
    .map(([filepath, content]) => ({
      path: filepath,
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
      ...buildPresetParams('.github/labeler.yml', fs),
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
