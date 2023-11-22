export type PresetMeta = {
  filename: string
  existingContent: string
  glob: (pattern: string, opts: any) => string[]
  fs: typeof import('fs')
  path: typeof import('path')
}

export interface PresetDependencies {
  fs: typeof import('fs')
  path: typeof import('path')
  lodash: typeof import('lodash')
  jsYaml: typeof import('js-yaml')
  dedent: typeof import('dedent')
  glob: Pick<typeof import('glob'), 'globSync'>
  readPkgUp: Pick<typeof import('read-pkg-up'), 'sync'>
}

export type PresetParams<Options = {}> = {
  options: Options
  meta: PresetMeta
  context: import('eslint').Rule.RuleContext
  dependencies: PresetDependencies
}

export type Preset<Options extends {} = {}> = (params: PresetParams<Options>) => string

// codegen:start {preset: barrel}
export * from './barrel'
export * from './custom'
export * from './empty'
export * from './labeler'
export * from './markdown-from-jsdoc'
export * from './markdown-from-tests'
export * from './markdown-toc'
export * from './monorepo-toc'
// codegen:end
