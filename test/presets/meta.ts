import * as glob from 'glob'
import {PresetMeta} from '../../src/presets'

export const meta = {
  filename: 'index.ts',
  existingContent: '',
  glob: glob.globSync,
  format: (s: string) => s,
  fs: require('fs'),
  path: require('path'),
} as PresetMeta
