import type {Preset} from '.'

/**
 * Generate a table of contents from the current markdown file, based on markdown headers (e.g. `### My section title`)
 *
 * ##### Example
 *
 * `<!-- codegen:start {preset: markdownTOC, minDepth: 2, maxDepth: 5} -->`
 *
 * @param minDepth exclude headers with lower "depth". e.g. if set to 2, `# H1` would be excluded but `## H2` would be included. @default 2
 * @param maxDepth exclude headers with higher "depth". e.g. if set to 3, `#### H4` would be excluded but `### H3` would be included. @default Infinity
 */
export const markdownTOC: Preset<{minDepth?: number; maxDepth?: number}> = ({context, options, dependencies}) => {
  const {fs, marked, cheerio} = dependencies
  const fileContent = fs.readFileSync(context.physicalFilename).toString()
  const html = marked.parse(fileContent, {gfm: true}) as string
  const $ = cheerio.load(html)
  const minDepth = options.minDepth || 2
  const maxDepth = options.maxDepth || Number.POSITIVE_INFINITY
  const levels = [1, 2, 3, 4, 5, 6].filter(level => level >= minDepth && level <= maxDepth).map(level => `h${level}`)

  const tags = $(levels.join(','))

  return tags
    .toArray()
    .map(tag => {
      const tagLevel = Number($(tag).prop('tagName')!.slice(1))
      const indent = ' '.repeat(3 * (tagLevel - minDepth))
      const text = $(tag).text()
      const href = text
        .toLowerCase()
        .replaceAll(/\s/g, '-')
        .replaceAll(/[^\w-]/g, '')
      return {text, indent, href}
    })
    .map(({indent, text, href}, i, arr) => {
      const previousDupes = arr.filter((x, j) => x.href === href && j < i)
      const fixedHref = previousDupes.length === 0 ? href : `${href}-${previousDupes.length}`
      return `${indent}- [${text}](#${fixedHref})`
    })
    .join('\n')
}
