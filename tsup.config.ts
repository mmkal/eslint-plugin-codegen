// eslint-disable-next-line no-restricted-imports
import * as fs from 'fs'
import * as glob from 'glob'
import * as path from 'path'
import {defineConfig} from 'tsup'

// we aren't using tsup like most people. it's *only* for a single file, which is a barrel(!) file of all the modules we want to be able to use
// in this (CJS) package, but are ESM-only. We achieve this by tsup-ing the runtime into CJS, then globbing and copying the types.

const esmModulesFilepath = 'src/esm-modules.ts'
const libsToBundle = Array.from(
  fs.readFileSync(esmModulesFilepath, 'utf8').matchAll(/^export \* as (\S+) from ["'](\S+)["']/gm),
).map(([_, identifier, name]) => {
  const packageJson = JSON.parse(
    fs.readFileSync(`node_modules/${name}/package.json`, 'utf8'),
  ) as import('type-fest').PackageJson
  const types = (packageJson.exports as {types?: string})?.types || packageJson.types
  if (typeof types !== 'string') throw new Error(`No types found for ${name}`)
  return {name, identifier, types}
})

export default defineConfig({
  entry: [esmModulesFilepath],
  dts: false, // we're going to glob + copy the types instead
  noExternal: libsToBundle.map(lib => lib.name),
  outDir: 'dist/bundled-esm-modules',
  plugins: [
    {
      name: 'write-shims',
      buildEnd: () => {
        fs.writeFileSync(
          'dist/esm-modules.js',
          `module.exports = require("./bundled-esm-modules/esm-modules.js") // bundled by tsup`,
        )
        for (const {name} of libsToBundle) {
          const dtsFiles = glob.globSync(`node_modules/${name}/**/*.d.ts`)
          for (const dtsFile of dtsFiles) {
            const target = dtsFile.replace(`node_modules/${name}`, `dist/bundled-esm-modules/types/${name}`)
            fs.mkdirSync(path.dirname(target), {recursive: true})
            fs.copyFileSync(dtsFile, target)
          }
        }
        fs.writeFileSync(
          'dist/esm-modules.d.ts',
          libsToBundle
            .map(lib => {
              const typesPath = path.join('bundled-esm-modules/types', lib.name, lib.types)
              return `export * as ${lib.identifier} from './${typesPath}' // bundled by tsup post-build script`
            })
            .join('\n'),
        )
      },
    },
  ],
})
