import type {Preset} from '.'
import generate from '@babel/generator'
import {parse} from '@babel/parser'
import * as glob from 'glob'
import {match} from 'io-ts-extra'
import * as lodash from 'lodash'
import * as path from 'path'

const defaultExtensions = ['.js', '.mjs', '.ts', '.tsx']
const defaultExtensionsMap = Object.fromEntries(defaultExtensions.map(e => [e.replace('.', ''), e.replace('.', '')]))
/**
 * Bundle several modules into a single convenient one.
 *
 * @example
 * // codegen:start {preset: barrel, include: some/path/*.ts, exclude: some/path/*util.ts}
 * export * from './some/path/module-a'
 * export * from './some/path/module-b'
 * export * from './some/path/module-c'
 * // codegen:end
 *
 * @param include
 * [optional] If specified, the barrel will only include file paths that match this glob pattern
 * @param exclude
 * [optional] If specified, the barrel will exclude file paths that match these glob patterns
 * @param import
 * [optional] If specified, matching files will be imported and re-exported rather than directly exported
 * with `export * from './xyz'`. Use `import: star` for `import * as xyz from './xyz'` style imports.
 * Use `import: default` for `import xyz from './xyz'` style imports.
 * @param export
 * [optional] Only valid if the import style has been specified (either `import: star` or `import: default`).
 * If specified, matching modules will be bundled into a const or default export based on this name. If set
 * to `{name: someName, keys: path}` the relative file paths will be used as keys. Otherwise the file paths
 * will be camel-cased to make them valid js identifiers.
 * @param extension
 * [optional] Useful for ESM modules. If set to true files will be imported with the file extension.
 * If set to an object, extensions will be converted using this object.
 */
export const barrel: Preset<{
  include?: string
  exclude?: string | string[]
  import?: 'default' | 'star'
  export?: string | {name: string; keys: 'path' | 'camelCase'}
  extension?: boolean | Record<string, string>
}> = ({meta, options: opts}) => {
  const cwd = path.dirname(meta.filename)

  const extensionsToRemove = opts.extension ? [] : defaultExtensions

  const extensionMap = typeof opts.extension === 'object' ? opts.extension : defaultExtensionsMap

  const ext = meta.filename.split('.').slice(-1)[0]
  const pattern = opts.include || `*.{${ext},${ext}x}`
  const exclude = Array.isArray(opts.exclude) ? opts.exclude : opts.exclude ? [opts.exclude] : undefined

  const relativeFiles = glob
    // todo[glob>10.3.10]: use exclude directly when https://github.com/isaacs/node-glob/issues/570 is fixed
    .globSync(pattern, {cwd, ignore: exclude?.map(e => e.replace(/^\.\//, ''))})
    .sort((a, b) => a.localeCompare(b))
    .filter(f => path.resolve(cwd, f) !== path.resolve(meta.filename))
    .map(f => `./${f}`.replace(/(\.\/)+\./g, '.'))
    .map(f => {
      const base = f.replace(/\.\w+$/, '')

      const replacedExtension = f.replace(`.${ext}`, `.${extensionMap[ext]}`)

      const firstLetter = /[a-z]/i.exec(f)?.[0]
      const camelCase = lodash
        .camelCase(base)
        .replace(/^([^a-z])/, '_$1')
        .replace(/Index$/, '')
      const identifier = firstLetter === firstLetter?.toUpperCase() ? lodash.upperFirst(camelCase) : camelCase

      return {
        import: extensionsToRemove.includes(path.extname(f)) ? base : f.endsWith(ext) ? replacedExtension : f,
        identifier,
      }
    })
    .sort((a, b) => a.import.localeCompare(b.import))

  const expectedContent = match(opts.import)
    .case(undefined, () => {
      return relativeFiles.map(f => `export * from '${f.import}'`).join('\n')
    })
    .case(String, s => {
      const importPrefix = s === 'default' ? '' : '* as '
      const withIdentifiers = lodash
        .chain(relativeFiles)
        .groupBy(info => info.identifier)
        .values()
        .flatMap(group =>
          group.length === 1 ? group : group.map((info, i) => ({...info, identifier: `${info.identifier}_${i + 1}`})),
        )
        .value()

      const imports = withIdentifiers.map(i => `import ${importPrefix}${i.identifier} from '${i.import}'`).join('\n')
      const exportProps = match(opts.export)
        .case({name: String, keys: 'path'}, () =>
          withIdentifiers.map(i => `${JSON.stringify(i.import)}: ${i.identifier}`),
        )
        .default(() => withIdentifiers.map(i => i.identifier))
        .get()

      const exportPrefix = match(opts.export)
        .case(undefined, () => 'export')
        .case('default', () => 'export default')
        .case({name: 'default'}, () => 'export default')
        .case(String, name => `export const ${name} =`)
        .case({name: String}, ({name}) => `export const ${name} =`)
        .get()

      const exports = exportProps.join(',\n ')

      return `${imports}\n\n${exportPrefix} {\n ${exports}\n}\n`
    })
    .get()

  // ignore stylistic differences. babel generate deals with most
  const normalise = (str: string) =>
    generate(parse(str, {sourceType: 'module', plugins: ['typescript']}) as any)
      .code.replace(/'/g, `"`)
      .replace(/\/index/g, '')

  try {
    if (normalise(expectedContent) === normalise(meta.existingContent)) {
      return meta.existingContent
    }
  } catch {
    // fall back to return statement below
  }

  return expectedContent
}
