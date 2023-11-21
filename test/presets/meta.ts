import * as glob from 'glob'
import * as fs from 'node:fs' // 'node:fs' rather than 'fs' to avoid test mock trying to shim this
import * as path from 'path'
import {PresetMeta} from '../../src/presets'

export const getMeta = (filename: string): PresetMeta => ({
  filename,
  existingContent: fs.readFileSync(__filename).toString(),
  glob: glob.globSync,
  fs,
  path,
})
