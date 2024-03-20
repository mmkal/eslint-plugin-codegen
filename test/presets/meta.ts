import * as glob from 'glob'
import * as realfs from 'node:fs' // 'node:fs' rather than 'fs' to avoid test mock trying to shim this
import * as path from 'path'
import {dependencies} from '../../src'
import {PresetMeta, PresetParams} from '../../src/presets'

export const getMeta = (filename: string, fs = realfs): PresetMeta => ({
  filename,
  existingContent: fs.readFileSync(__filename).toString(),
  glob: glob.globSync as never,
  fs,
  path,
})

export const buildPresetParams = (filename: string, fs = realfs): Omit<PresetParams, 'options'> => ({
  meta: getMeta(filename),
  context: {filename, physicalFilename: filename} as any,
  dependencies: {...dependencies, fs},
})

export const getFakeFs = () => {
  const mockFs: any = {}

  const reset = () => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Object.keys(mockFs).forEach(k => delete mockFs[k])
  }

  const actual = require('fs')
  const reader =
    (orig: string) =>
    (...args: any[]) => {
      if (args[0] in mockFs) {
        return mockFs[args[0]]
      }

      const filepath = args[0]
        .replace(process.cwd() + '\\', '')
        .replace(process.cwd() + '/', '')
        .replaceAll('\\', '/')
      if (filepath in mockFs) {
        return mockFs[filepath]
      }

      return actual[orig](...args)
    }

  const fs = {
    ...actual,
    readFileSync: reader('readFileSync'),
    existsSync: reader('existsSync'),
    readdirSync: (filepath: string) => Object.keys(mockFs).filter(k => k.startsWith(filepath.replace(/^\.\/?/, ''))),
    statSync: () => ({isFile: () => true, isDirectory: () => false}),
  }

  return {mockFs, reset, fs}
}
