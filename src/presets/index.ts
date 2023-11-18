export type PresetMeta = {
  filename: string
  existingContent: string
  glob: (pattern: string, opts: any) => string[]
  fs: typeof import('fs')
  path: typeof import('path')
}

export type Preset<Options> = (params: {meta: PresetMeta; options: Options}) => string

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
