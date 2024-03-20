import * as glob from 'glob'
import * as fs from 'node:fs' // 'node:fs' rather than 'fs' to avoid test mock trying to shim this
import * as path from 'path'
import {dependencies} from '../../src'
import {PresetMeta, PresetParams} from '../../src/presets'

export const getMeta = (filename: string): PresetMeta => ({
  filename,
  existingContent: fs.readFileSync(__filename).toString(),
  glob: glob.globSync as never,
  fs,
  path,
})

export const buildPresetParams = (filename: string): Omit<PresetParams, 'options'> => ({
  meta: getMeta(filename),
  context: {filename, physicalFilename: filename} as any,
  dependencies: dependencies,
})
