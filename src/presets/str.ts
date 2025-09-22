import {definePreset} from './util/standard-schema-preset'

/**
 * Copies a whole other file into a const variable. Useful for capturing a file's full contents as a hard-coded string.
 * Obviously this creates duplicated data, so use judiciously!
 *
 * ##### basic usage
 * ```js
 * // codegen:start {preset: copy, source: ../../another-project/src/some-file.ts}
 * import {z} from 'zod'
 * export const MyObject = z.object({ foo: z.string() })
 * // codegen:end
 * ```
 *
 * #### excludeLines
 *
 * ```ts
 * ;
 * import {z} from 'zod/v4' // in this project we use zod v4, but we're copying from a project that uses zod v3
 * // codegen:start {preset: copy, source: ../../another-project/src/some-file.ts, excludeLines: ['^import']}
 * ;
 * export const MyObject = z.object({ foo: z.string() })
 * // codegen:end
 * ```
 *
 * #### onlyIfExists
 * ```js
 * // copy a file from a sibling project, but only if the sibling project actually exists
 * // in this case this will effectively skip the copying step on machines that don't have the sibling project installed
 * // e.g. on CI runners.
 * // codegen:start {preset: copy, source: ../../another-project/src/some-file.ts, onlyIfExists: ../../another-project/package.json}
 * ;
 * import {z} from 'zod'
 * ;
 * export const MyObject = z.object({ foo: z.string() });
 * ;
 * // codegen:end
 * ```
 *
 * #### comparison
 * ```js
 * // by default, the content will perform a "simplified" comparison with existing content, so differences from tools like prettier
 * // are ignored. if you care about whitespace and similar differences, you can set the comparison option to `strict`.
 * // codegen:start {preset: copy, source: ../../another-project/src/some-file.ts, comparison: strict}
 * ;
 * import {z} from "zod"
 * ;
 * export const MyObject = z.object({ foo: z.string() })
 * ;
 * // codegen:end
 * ```
 */
export const str = definePreset(
  {
    source: 'string',
    const: 'string',
    'export?': 'boolean',
    /** path to the file to copy. can be absolute or relative to the file being linted */
    /** if provided, only runs if this file exists - if it's missing, the existing content is returned (defaulting to empty string) */
    'onlyIfExists?': 'string',
    /** if provided, these lines will be removed from the copied content. e.g. `excludeLines: ['^import', '// codegen:']` */
    'excludeLines?': 'string[]',
    /**
     * if set to `strict` the content will update if it's not a perfect match. by default (`simplified`) it will only update
     * if the "simplified" version of the content is different.
     */
    'comparison?': '"simplified" | "strict"',
  },
  ({options, meta, context, dependencies: {fs, path, simplify}}) => {
    // todo: add an option to allow syncing the other way - that is, if the content on the file being linted is newer,
    // don't autofix - offer two suggestions: 1) write to the source file, 2) write to the file being linted.
    const getAbsolutePath = (filepath: string) => path.resolve(path.dirname(context.physicalFilename), filepath)
    const shouldRun = options.onlyIfExists ? fs.existsSync(getAbsolutePath(options.onlyIfExists)) : true
    if (!shouldRun) return meta.existingContent || ''

    let content = fs.readFileSync(getAbsolutePath(options.source), 'utf8')
    if (options.excludeLines) {
      const regexes = options.excludeLines.map(line => new RegExp(line))
      const lines = content.split('\n')
      content = lines.filter(line => !regexes.some(regex => regex.test(line))).join('\n')
    }

    content = `const ${options.const} = ${JSON.stringify(content)}`
    if (options.export) content = `export ${content}`

    let isUpToDate: boolean
    // eslint-disable-next-line unicorn/prefer-ternary
    if (!options.comparison || options.comparison === 'simplified') {
      // we only want to declare it outdated if the simplified versions are different
      isUpToDate = simplify.equivalentSimplified(content, meta.existingContent)
    } else {
      isUpToDate = content === meta.existingContent
    }

    if (isUpToDate) return meta.existingContent || ''

    return content
  },
)
