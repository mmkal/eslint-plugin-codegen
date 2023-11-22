export type PresetMeta = {
  existingContent: string
  /** @deprecated instead of `meta.filename` use `context.physicalFilename` */
  filename: string
  /** @deprecated instead of `meta.glob` use `dependencies.glob.globSync` */
  glob: (pattern: string, opts: any) => string[]
  /** @deprecated instead of `meta.fs` use `dependencies.fs` */
  fs: typeof import('fs')
  /** @deprecated instead of `meta.path` use `dependencies.path` */
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
