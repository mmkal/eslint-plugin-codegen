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
import * as path from 'path'
import * as readPkgUp from 'read-pkg-up'
import * as recast from 'recast'
import * as zx from 'zx'
import * as esmModules from './esm-modules'
import {fetchSync} from './fetch-sync'
import {makeSynchronous} from './make-synchronous'
import * as simplify from './simplify'

export interface PresetDependencies {
  fs: typeof import('fs')
  path: typeof import('path')
  child_process: typeof import('child_process')
  lodash: typeof import('lodash')
  jsYaml: typeof import('js-yaml')
  dedent: typeof import('dedent').default
  glob: Pick<typeof import('glob'), 'globSync'>
  readPkgUp: Pick<typeof import('read-pkg-up'), 'sync'>
  cheerio: typeof import('cheerio')
  isomorphicGit: typeof import('isomorphic-git')
  zx: typeof import('zx')
  makeSynchronous: typeof import('./make-synchronous').makeSynchronous
  fetchSync: typeof import('./fetch-sync').fetchSync
  simplify: typeof import('./simplify')
  babelParser: typeof import('@babel/parser')
  babelTraverse: typeof import('@babel/traverse')
  babelGenerator: typeof import('./types/babel-generator')
  babelTypes: typeof import('@babel/types')
  recast: typeof import('recast')
  arktype: typeof esmModules.arktype
}

export const dependencies: PresetDependencies = {
  dedent: Object.assign(dedent, {default: dedent}), // backcompat: accidentally used `import * as dedent from 'dedent'` previously
  fs,
  path,
  glob,
  jsYaml,
  lodash,
  readPkgUp,
  child_process,
  makeSynchronous,
  fetchSync,
  simplify,
  cheerio,
  isomorphicGit,
  zx,
  babelParser,
  babelTraverse,
  babelGenerator: babelGenerator as never,
  babelTypes,
  recast,
  ...esmModules,
}
