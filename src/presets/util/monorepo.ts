import * as fs from 'fs'
import {globSync} from 'glob'
import {match} from 'io-ts-extra'
import * as jsYaml from 'js-yaml'
import * as lodash from 'lodash'
import * as path from 'path'
import * as readPkgUp from 'read-pkg-up'
import type {PackageJson} from 'type-fest'
import {inspect} from 'util'

export interface PackageGlobbable {
  repoRoot?: string
}

export const getLeafPackages = (repoRoot: string | undefined, filename: string) => {
  const contextDir = match(repoRoot)
    .case(String, s => path.join(path.dirname(filename), s))
    .default(() => path.dirname(readPkgUp.sync({cwd: path.dirname(filename)})!.path))
    .get()

  const maybeReadFile = (f: string) => {
    const filepath = path.join(contextDir, f)
    return fs.existsSync(filepath) ? fs.readFileSync(filepath).toString() : null
  }

  const readJsonFile = <T>(f: string) => JSON.parse(maybeReadFile(f) || 'null') as T
  const readYamlFile = <T>(f: string) => jsYaml.load(maybeReadFile(f) || 'null') as T

  const parseLernaJson = () => readJsonFile<{packages: string[]}>('lerna.json')?.packages
  const parsePnpmWorkspace = () =>
    readYamlFile<{packages: string[]}>(path.join(contextDir, 'pnpm-workspace.yaml'))?.packages

  const pkg = readJsonFile<{workspaces?: {packages?: string[]}}>('package.json')
  const packageGlobs = pkg.workspaces?.packages || pkg.workspaces || parseLernaJson() || parsePnpmWorkspace()

  if (!Array.isArray(packageGlobs)) {
    throw new TypeError(`Expected to find workspaces array, got ${inspect(packageGlobs)}`)
  }

  const packages = lodash
    .flatMap(packageGlobs, pattern => globSync(`${pattern}/package.json`, {cwd: contextDir}))
    .map(p => ({path: p, packageJson: readJsonFile<PackageJson>(p)}))
  return lodash.compact(packages)
}
