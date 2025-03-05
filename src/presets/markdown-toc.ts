import type {Preset} from '.'
import * as cheerio from 'cheerio'
import * as lodash from 'lodash'
import {marked} from 'marked'
import * as os from 'os'
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
export const markdownTOC: Preset<{minDepth?: number; maxDepth?: number}> = ({context, options, dependencies: {fs}}) => {
  const html = marked.parse(fs.readFileSync(context.physicalFilename).toString()) as string
  const $ = cheerio.load(html)
  const lines = fs
    .readFileSync(context.physicalFilename)
    .toString()
    .split('\n')
    .map(line => line.trim())
  const headings = lines.filter(line => {
    const hashes = /^(#+) /.exec(line)
    if (!hashes) return false
    const depth = hashes[1].length
    return depth >= (options.minDepth || 2) && depth <= (options.maxDepth || Number.POSITIVE_INFINITY)
  })
  const minHashes = lodash.min(headings.map(h => h.split(' ')[0].length))!
  return headings
    .map(h => {
      const hashes = h.split(' ')[0]
      const indent = ' '.repeat(3 * (hashes.length - minHashes))
      const text = h
        .slice(hashes.length + 1)
        .replaceAll(/]\(.*\)/g, '')
        .replaceAll(/[[\]]/g, '')
      const href = text
        .toLowerCase()
        .replaceAll(/\s/g, '-')
        .replaceAll(/[^\w-]/g, '')
      return {indent, text, href}
    })
    .map(({indent, text, href}, i, arr) => {
      const previousDupes = arr.filter((x, j) => x.href === href && j < i)
      const fixedHref = previousDupes.length === 0 ? href : `${href}-${previousDupes.length}`
      return `${indent}- [${text}](#${fixedHref})`
    })
    .join(os.EOL)
}
