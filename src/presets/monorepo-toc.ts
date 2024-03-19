import type {Preset} from '.'
import {graphSequencer} from '@pnpm/deps.graph-sequencer'
import * as fs from 'fs'
import * as lodash from 'lodash'
import * as os from 'os'
import * as path from 'path'

import {getLeafPackages} from './util/monorepo'
import {relative} from './util/path'

/**
 * Generate a table of contents for a monorepo.
 *
 * ##### Example (basic)
 *
 * `<!-- codegen:start {preset: monorepoTOC} -->`
 *
 * ##### Example (using config options)
 *
 * `<!-- codegen:start {preset: monorepoTOC, repoRoot: .., workspaces: lerna, filter: {package.name: foo}, sort: -readme.length} -->`
 *
 * @param repoRoot
 * [optional] the relative path to the root of the git repository. By default, searches parent directories for a package.json to find the "root".
 * @param filter
 * [optional] a dictionary of filter rules to whitelist packages. Filters can be applied based on package.json keys,
 *
 * examples:
 * - `filter: '@myorg/.*-lib'` (match packages with names matching this regex)
 * - `filter: { package.name: '@myorg/.*-lib' }` (equivalent to the above)
 * - `filter: { package.version: '^[1-9].*' }` (match packages with versions starting with a non-zero digit, i.e. 1.0.0+)
 * - `filter: '^(?!.*(internal$))'` (match packages that do not contain "internal" anywhere (using [negative lookahead](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Lookahead_assertion)))
 * - `filter: { package.name: '@myorg', path: 'libraries' }` (match packages whose name contains "@myorg" and whose path matches "libraries")
 * - `filter: { readme: 'This is production-ready' }` (match packages whose readme contains the string "This is production-ready")
 * @param sort
 * [optional] sort based on package properties (see `filter`), or readme length. Use `-` as a prefix to sort descending.
 * examples:
 * - `sort: package.name` (sort by package name)
 * - `sort: -readme.length` (sort by readme length, descending)
 * - `sort: toplogical` (sort by toplogical dependencies, starting with the most depended-on packages)
 */
export const monorepoTOC: Preset<{
  repoRoot?: string
  filter?: string | Record<string, string>
  sort?: string
}> = ({options, context}) => {
  const packages = getLeafPackages(options.repoRoot, context.physicalFilename)

  const packageNames = new Set(packages.map(({packageJson}) => packageJson.name))
  const toposorted = toposort(
    Object.fromEntries(
      packages
        .map(({packageJson}) => {
          const dependencies = Object.keys({...packageJson.dependencies, ...packageJson.devDependencies}).filter(dep =>
            packageNames.has(dep),
          )
          return [packageJson.name!, dependencies] as const
        })
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  )
  const toposortIndexes = Object.fromEntries(
    toposorted.chunks.flatMap((chunk, i) => {
      return chunk.map(pkg => [pkg, i] as const)
    }),
  )

  const leafPackages = packages
    .map(({path: leafPath, packageJson: leafPkg}) => {
      const dirname = path.dirname(leafPath)
      const readmePath = [path.join(dirname, 'readme.md'), path.join(dirname, 'README.md')].find(p => fs.existsSync(p))
      const readme = [readmePath && fs.readFileSync(readmePath).toString(), leafPkg.description]
        .filter(Boolean)
        .join(os.EOL + os.EOL)
      return {
        package: leafPkg,
        path: leafPath,
        readme,
        topological: toposortIndexes[leafPkg.name!] ?? Number.POSITIVE_INFINITY,
      }
    })
    .filter(props => {
      const filter = typeof options.filter === 'object' ? options.filter : {'package.name': options.filter!}
      return (
        Object.keys(filter)
          .filter(key => typeof filter[key] === 'string')
          // // eslint-disable-next-line @rushstack/security/no-unsafe-regexp
          .every(key => new RegExp(lodash.get(filter, key)).test(lodash.get(props, key) as string))
      )
    })
    .sort((...args) => {
      const sort = options.sort || 'package.name'
      const multiplier = sort.startsWith('-') ? -1 : 1
      const key = sort.replace(/^-/, '')
      const [a, b] = args.map(arg => lodash.get(arg, key) as string)
      const comp = a < b ? -1 : a > b ? 1 : 0
      return comp * multiplier
    })
    .map(props => ({leafPath: props.path, leafPkg: props.package, readme: props.readme}))
    .map(({leafPath, leafPkg, readme}) => {
      const description = (() => {
        return readme
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .find(line => /^[A-Za-z]/.exec(line))
      })()
      const {name} = leafPkg
      const homepage =
        leafPkg.homepage || relative(path.dirname(context.physicalFilename), leafPath).replace(/\/package.json$/, '')
      return [`- [${name}](${homepage})`, description].filter(Boolean).join(' - ').trim()
    })

  return leafPackages.join(os.EOL)
}

export const toposort = <K extends string, Deps extends K>(graph: Record<K, Deps[]>) => {
  return graphSequencer<K>(
    new Map(Object.entries(graph) as Array<[K, Array<K | Deps>]>),
    Object.keys(graph).sort() as K[],
  )
}
