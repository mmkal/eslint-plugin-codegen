import * as glob from 'glob'
import minimatch from 'minimatch'
import readPkgUp from 'read-pkg-up'
import {test, expect, beforeEach, vi} from 'vitest'
import * as preset from '../../src/presets/labeler'
import {buildPresetParams, getFakeFs} from './meta'

const {fs, mockFs, reset} = getFakeFs()

beforeEach(() => {
  reset()
})

vi.mock('glob')

vi.spyOn(glob, 'globSync').mockImplementation((pattern, opts) => {
  const found = Object.keys(mockFs).filter(k => minimatch(k, pattern as string))
  const ignores = typeof opts?.ignore === 'string' ? [opts?.ignore] : opts?.ignore || []
  return found.filter(f => (ignores as string[]).every(i => !minimatch(f, i)))
})

vi.mock('read-pkg-up')

vi.spyOn(readPkgUp, 'sync').mockImplementation(options =>
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
