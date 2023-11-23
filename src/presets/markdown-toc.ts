import type {Preset} from '.'
import * as fs from 'fs'
import * as lodash from 'lodash'
import * as os from 'os'

/**
 * Generate a table of contents from the current markdown file, based on markdown headers (e.g. `### My section title`)
 *
 * ##### Example
 *
 * `<!-- codegen:start {preset: markdownTOC, minDepth: 2, maxDepth: 5} -->`
 *
 * @param minDepth exclude headers with lower "depth". e.g. if set to 2, `# H1` would be excluded but `## H2` would be included. @default 2
 * @param maxDepth exclude headers with higher "depth". e.g. if set to 3, `#### H4` would be excluded but `### H3` would be included.p
 */
export const markdownTOC: Preset<{minDepth?: number; maxDepth?: number}> = ({meta, options}) => {
  const lines = fs
    .readFileSync(meta.filename)
    .toString()
    .split('\n')
    .map(line => line.trim())
  const headings = lines
    .filter(line => /^#+ /.exec(line))
    .filter(line => line.startsWith('#'.repeat(options.minDepth || 2)))
    .filter(line => line.split(' ')[0].length < (options.maxDepth || Number.POSITIVE_INFINITY))
  const minHashes = lodash.min(headings.map(h => h.split(' ')[0].length))!
  return headings
    .map(h => {
      const hashes = h.split(' ')[0]
      const indent = ' '.repeat(3 * (hashes.length - minHashes))
      const text = h
        .slice(hashes.length + 1)
        .replace(/]\(.*\)/g, '')
        .replace(/[[\]]/g, '')
      const href = text
        .toLowerCase()
        .replace(/\s/g, '-')
        .replace(/[^\w-]/g, '')
      return {indent, text, href}
    })
    .map(({indent, text, href}, i, arr) => {
      const previousDupes = arr.filter((x, j) => x.href === href && j < i)
      const fixedHref = previousDupes.length === 0 ? href : `${href}-${previousDupes.length}`
      return `${indent}- [${text}](#${fixedHref})`
    })
    .join(os.EOL)
}
