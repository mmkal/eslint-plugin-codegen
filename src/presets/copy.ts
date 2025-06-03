import {definePreset} from './util/standard-schema-preset'

/**
 * Copies a whole other file
 */
export const copy = definePreset(
  {
    /** path to the file to copy. can be absolute or relative to the file being linted */
    source: 'string',
    /** if provided, only runs if this file exists - if it's missing, the existing content is returned (defaulting to empty string) */
    onlyIfExists: 'string | undefined',
    /** if provided, these lines will be removed from the copied content. e.g. `excludeLines: ['^import', '// codegen:']` */
    excludeLines: 'string[] | undefined',
    /**
     * if set to `strict` the content will update if it's not a perfect match. by default (`simplified`) it will only update
     * if the "simplified" version of the content is different.
     */
    comparison: '"simplified" | "strict" | undefined',
  },
  ({options, meta, context, dependencies: {fs, path, simplify}}) => {
    const getAbsolutePath = (filepath: string) => path.resolve(path.dirname(context.physicalFilename), filepath)
    const shouldRun = options.onlyIfExists ? fs.existsSync(getAbsolutePath(options.onlyIfExists)) : true
    if (!shouldRun) return meta.existingContent || ''

    let content = fs.readFileSync(getAbsolutePath(options.source), 'utf8')
    if (options.excludeLines) {
      const regexes = options.excludeLines.map(line => new RegExp(line))
      const lines = content.split('\n')
      content = lines.filter(line => !regexes.some(regex => regex.test(line))).join('\n')
    }

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
