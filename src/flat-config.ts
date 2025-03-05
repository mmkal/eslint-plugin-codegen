import {createProcessor} from './processor'
import {codegen as rule} from './rule'

export const codegenProcessableGlobs = ['*.md', '*.mdx', '*.yml', '*.yaml']
export const codegenProcessedGlobs = codegenProcessableGlobs.map(f => `**/${f}/*.{js,ts,jsx,tsx,cjs,mjs,cts,mts}`)

export const flatConfig: import('eslint').Linter.FlatConfig[] = [
  {
    plugins: {
      codegen: {
        rules: {
          codegen: rule,
        },
        processors: {
          processor: createProcessor(),
        },
      },
    },
  },
  {
    files: codegenProcessableGlobs,
    processor: 'codegen/processor',
    rules: {
      'codegen/codegen': 'warn',
    },
  },
  {
    files: codegenProcessedGlobs,
    rules: {
      'codegen/codegen': 'warn',
    },
  },
  {
    files: ['**/*.{js,ts,jsx,tsx,cjs,mjs,cts,mts}'],
    rules: {
      'codegen/codegen': 'warn',
    },
  },
]
