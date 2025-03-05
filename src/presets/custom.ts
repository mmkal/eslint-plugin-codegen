import type {Preset} from '.'
import * as path from 'path'

const tsxAvailable = () => {
  try {
    require.resolve('tsx/cjs')
    return true
  } catch {
    return false
  }
}

const tsNodeAvailable = () => {
  try {
    require.resolve('ts-node/register/transpile-only')
    return true
  } catch {
    return false
  }
}

interface CustomPresetOptions {
  source?: string
  export?: string
  require?: string
  dev?: boolean
}

/**
 * Define your own codegen function, which will receive all options specified.
 *
 * Import the `Preset` type from this library to define a strongly-typed preset function:
 *
 * @example
 * export const jsonPrinter: import('eslint-plugin-codegen').Preset<{myCustomProp: string}> = ({meta, options}) => {
 *   const components = meta.glob('**\/*.tsx') // uses 'globSync' from glob package
 *   const json = JSON.stringify({filename: meta.filename, customProp: options.myCustomProp, components}, null, 2)
 *   return `export default ${json}`
 * }
 *
 * // codegen:start {export: jsonPrinter}
 *
 * @description
 * This can be used in other files by specifying the `source` option like:
 *
 *
 * `<!-- codegen:start {source: ./lib/my-custom-preset.js, export: jsonPrinter, myCustomProp: hello}`
 *
 * <br />
 *
 * Note that some helpers passed via `dependencies`, such as `glob`, `fs`, `path`, `child_process`, `lodash`, `jsYaml`, `dedent`, and `readPkgUp`, corresponding to those
 * node modules respectively. These can be useful to allow access to those libraries without them being production dependencies.
 * This also allows your lint process to use these node-only dependencies, even in a file that is not run in node - only the calls would be included in any
 * bundled output, not the dependencies themselves.
 *
 * @param source Relative path to the module containing the custom preset. Default: the file being linted.
 * @param export The name of the export. If omitted, the module's default export should be a preset function.
 * @param require A module to load before `source`. If not set, defaults to `tsx/cjs` or `ts-node/register/transpile-only` for typescript sources.
 * @param dev Set to `true` to clear the require cache for `source` before loading. Allows editing the function without requiring an IDE reload. Default false if the `CI` enviornment variable is set, true otherwise.
 */
export const custom: Preset<CustomPresetOptions & Record<string, unknown>> = ({context, options, ...rest}) => {
  const {fs} = rest.dependencies
  const sourcePath = options.source
    ? path.join(path.dirname(context.physicalFilename), options.source)
    : context.physicalFilename
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error(`Source path is not a file: ${sourcePath}`)
  }

  let requireFirst = options.require
  if (
    !requireFirst &&
    (sourcePath.endsWith('.ts') ||
      sourcePath.endsWith('.tsx') ||
      sourcePath.endsWith('.cts') ||
      sourcePath.endsWith('.mts'))
  ) {
    if (tsxAvailable()) {
      requireFirst = 'tsx/cjs'
    } else if (tsNodeAvailable()) {
      requireFirst = 'ts-node/register/transpile-only'
    }
  }
  if (requireFirst) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(requireFirst)
  }

  if (options.dev ?? !process.env.CI) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete require.cache[sourcePath]
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const sourceModule = require(sourcePath)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const func: Preset<any> = options.export ? sourceModule[options.export] : sourceModule
  if (typeof func !== 'function') {
    throw new TypeError(`Couldn't find export ${options.export || 'function'} from ${sourcePath} - got ${typeof func}`)
  }

  return func({context, options, ...rest})
}
