/* eslint-disable @typescript-eslint/restrict-template-expressions */
import type * as eslint from 'eslint'
import {createProcessor} from './processor'
import {codegen} from './rule'

// idea: codegen/fs rule. type fs.anything and it generates an import for fs. same for path and os.

export type {Preset, PresetDependencies} from './presets'
export type {DefinePreset} from './presets/util/standard-schema-preset'

const processor = createProcessor()

export const processors = {
  '.md': processor,
  '.yml': processor,
  '.yaml': processor,
  processor,
} satisfies eslint.ESLint.Plugin['processors']

/** Legacy non-flat configs */
export const configs: eslint.ESLint.Plugin['configs'] = {
  recommended: {
    plugins: ['codegen'],
    rules: {
      'codegen/codegen': 'warn',
    },
    overrides: [
      {
        files: ['*.md'],
        processor: 'codegen/processor',
      },
    ],
  },
}

export const rules = {codegen}

export * from './flat-config'

export * as presets from './presets'

export * as flatConfig from './config'

export * as dependencies from './dependencies'
