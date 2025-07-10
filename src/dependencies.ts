import * as babelGenerator from '@babel/generator'
import * as babelParser from '@babel/parser'
import * as babelTraverse from '@babel/traverse'
import * as babelTypes from '@babel/types'
import * as cheerio from 'cheerio'
import * as child_process from 'child_process'
import dedent from 'dedent'
// eslint-disable-next-line no-restricted-imports
import * as fs from 'fs'
import * as glob from 'glob'
import * as isomorphicGit from 'isomorphic-git'
import * as jsYaml from 'js-yaml'
import lodash from 'lodash'
import * as memfs from 'memfs'
import * as path from 'path'
import * as readPkgUp from 'read-pkg-up'
import * as recast from 'recast'
import * as unionfs from 'unionfs'
import * as zx from 'zx'
import * as esmModules from './esm-modules'
import {fetchSync} from './fetch-sync'
import {makeSynchronous} from './make-synchronous'
import * as simplify from './simplify'

/*eslint sort-keys: "error"*/

export interface PresetDependencies {
  arktype: typeof esmModules.arktype
  babelGenerator: typeof import('./types/babel-generator')
  babelParser: typeof import('@babel/parser')
  babelTraverse: typeof import('@babel/traverse')
  babelTypes: typeof import('@babel/types')
  cheerio: typeof import('cheerio')
  child_process: typeof import('child_process')
  dedent: typeof import('dedent').default
  fetchSync: typeof import('./fetch-sync').fetchSync
  fs: typeof import('fs')
  glob: Pick<typeof import('glob'), 'globSync'>
  isomorphicGit: typeof import('isomorphic-git')
  jsYaml: typeof import('js-yaml')
  lodash: typeof import('lodash')
  makeSynchronous: typeof import('./make-synchronous').makeSynchronous
  memfs: typeof import('memfs')
  path: typeof import('path')
  readPkgUp: Pick<typeof import('read-pkg-up'), 'sync'>
  recast: typeof import('recast')
  simplify: typeof import('./simplify')
  unionfs: typeof import('unionfs')
  zx: typeof import('zx')
}

export const dependencies: PresetDependencies = {
  ...esmModules,
  babelGenerator: babelGenerator as never,
  babelParser,
  babelTraverse,
  babelTypes,
  cheerio,
  child_process,
  dedent: Object.assign(dedent, {default: dedent}), // backcompat: accidentally used `import * as dedent from 'dedent'` previously
  fetchSync,
  fs,
  glob,
  isomorphicGit,
  jsYaml,
  lodash,
  makeSynchronous,
  memfs,
  path,
  readPkgUp,
  recast,
  simplify,
  unionfs,
  zx,
}
