import {StringValue} from 'ms'

export type PresetMeta = {
  existingContent: string
  /** @deprecated instead of `meta.filename` use `context.physicalFilename` */
  filename: string
  /** @deprecated instead of `meta.glob` use `dependencies.glob.globSync` */
  glob: (pattern: string, opts: unknown) => string[]
  /** @deprecated instead of `meta.fs` use `dependencies.fs` */
  fs: typeof import('fs')
  /** @deprecated instead of `meta.path` use `dependencies.path` */
  path: typeof import('path')
}

export interface PresetDependencies {
  fs: typeof import('fs')
  path: typeof import('path')
  child_process: typeof import('child_process')
  lodash: typeof import('lodash')
  jsYaml: typeof import('js-yaml')
  dedent: typeof import('dedent').default
  glob: Pick<typeof import('glob'), 'globSync'>
  readPkgUp: Pick<typeof import('read-pkg-up'), 'sync'>
}

export interface CacheOptions {
  /** A string value like `'4 weeks'` which determines how long cached outputs can be used for */
  maxAge: StringValue
  /**
   * A function which should return all the inputs that should be hashed to check whether the cache can be used.
   * The return value should be serializable to JSON.
   * If not provided, the default inputs are: `{filename: context.physicalFilename, sourceCodeWithoutExistingContent, options: parameters.options}`
   * These defaults are passed in as parameters so they can either be ignored or extended.
   *
   * @example Include the contents of a certain directory as a hash input
   * ```ts
   * inputs: defaults => [defaults, globSync('some/path/*.ts').map(filepath => fs.readFileSync(filepath))]
   * ```
   */
  inputs?: (defaults: {
    filename: string
    sourceCodeWithoutExistingContent: string
    options: unknown
  }) => unknown
}

export type PresetParams<Options = {}> = {
  options: Options
  meta: PresetMeta
  context: import('eslint').Rule.RuleContext
  dependencies: PresetDependencies
  cache: (options: CacheOptions, fn: () => string) => string
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
