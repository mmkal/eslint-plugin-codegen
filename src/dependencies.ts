import * as child_process from 'child_process'
import * as dedent from 'dedent'
// eslint-disable-next-line no-restricted-imports
import * as fs from 'fs'
import * as glob from 'glob'
import * as jsYaml from 'js-yaml'
import lodash from 'lodash'
import * as path from 'path'
import * as readPkgUp from 'read-pkg-up'
import * as presetsModule from './presets'

export const dependencies: presetsModule.PresetDependencies = {
  dedent,
  fs,
  glob,
  jsYaml,
  lodash,
  path,
  readPkgUp,
  child_process,
}
