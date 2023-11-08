import type {Preset} from '.'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Define your own codegen function, which will receive all options specified.
 *
 * Import the `Preset` type from this library to define a strongly-typed preset function:
 *
 * @example
 * import {Preset} from 'eslint-plugin-codegen'
 *
 * export const jsonPrinter: Preset<{myCustomProp: string}> = ({meta, options}) => {
 *   const components = meta.glob('**\/*.tsx') // uses 'globSync' from glob package
 *   return `filename: ${meta.filename}\ncustom prop: ${options.myCustomProp}\nComponent paths: ${components.join(', ')}`
 * }
 *
 * @description
 * This can be used with:
 *
 * `<!-- codegen:start {preset: custom, source: ./lib/my-custom-preset.js, export: jsonPrinter, myCustomProp: hello}`
 *
 * Note that a `glob` helper method is passed to the preset via `meta`. This uses the `globSync` method of https://npm.im/glob. There are also `fs`
 * and `path` helpers passed, corresponding to those node modules respectively. These can be useful to allow access to those libraries without them
 * being production dependencies.
 *
 * @param source Relative path to the module containing the custom preset. Default: the file being linted.
 * @param export The name of the export. If omitted, the module's default export should be a preset function.
 * @param require A module to load before `source`. If not set, defaults to `ts-node/register/transpile-only` for typescript sources.
 * @param dev Set to `true` to clear the require cache for `source` before loading. Allows editing the function without requiring an IDE reload. Default false if the `CI` enviornment variable is set, true otherwise.
 */
export const custom: Preset<
  {
    source?: string
    export?: string
    require?: string
    dev?: boolean
  } & Record<string, unknown>
> = ({meta, options, ...rest}) => {
  const sourcePath = options.source ? path.join(path.dirname(meta.filename), options.source) : meta.filename
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error(`Source path is not a file: ${sourcePath}`)
  }

  const requireFirst = options.require || (sourcePath.endsWith('.ts') ? 'ts-node/register/transpile-only' : undefined)
  if (requireFirst) {
    // eslint-disable-next-line mmkal/@typescript-eslint/no-require-imports
    require(requireFirst)
  }

  if (options.dev ?? !process.env.CI) {
    // eslint-disable-next-line mmkal/@typescript-eslint/no-dynamic-delete
    delete require.cache[sourcePath]
  }

  // eslint-disable-next-line mmkal/@typescript-eslint/no-var-requires, mmkal/@typescript-eslint/no-require-imports
  const sourceModule = require(sourcePath)
  const func: Preset<any> = options.export ? sourceModule[options.export] : sourceModule
  if (typeof func !== 'function') {
    throw new TypeError(`Couldn't find export ${options.export || 'function'} from ${sourcePath} - got ${typeof func}`)
  }

  return func({meta, options, ...rest})
}
