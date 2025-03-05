import * as cheerio from 'cheerio'
import * as child_process from 'child_process'
import dedent from 'dedent'
// eslint-disable-next-line no-restricted-imports
import * as fs from 'fs'
import * as glob from 'glob'
import * as jsYaml from 'js-yaml'
import lodash from 'lodash'
import * as marked from 'marked'
import * as path from 'path'
import * as readPkgUp from 'read-pkg-up'
import {fetchSync} from './fetch-sync'
import {makeSynchronous} from './make-synchronous'
import * as presetsModule from './presets'

export const dependencies: presetsModule.PresetDependencies = {
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
  cheerio,
  marked,
}
