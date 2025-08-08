import {babel} from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import * as fs from 'fs'
import * as path from 'path'

const syncPromiseSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'sync-promise.js'), 'utf8')

/** @type {import('rollup').RollupOptions} */
const config = {
  input: 'src/isomorphic-git-sync.ts',
  output: {
    dir: 'src/vendor/isogit',
    format: 'cjs',
  },
  plugins: [
    nodeResolve(),
    commonjs({
      include: /node_modules/,
      requireReturnsDefault: 'auto', // <---- this solves default issue
    }),
    babel({
      babelHelpers: 'bundled',
      plugins: [['babel-plugin-transform-async-to-promises']],
    }),
    {
      name: 'async-lock-bypass',
      transform(code, id) {
        if (!id.includes('/async-lock/')) {
          return null
        }
        if (!code.includes('AsyncLock.prototype.acquire = function')) {
          return null
        }

        const transformedCode = code.replace(
          /AsyncLock\.prototype\.acquire = function/,
          `
            AsyncLock.prototype.acquire = function (key, fn) {
              return fn(); // no locking! Not needed because everything's synchronous; not possible because everything's synchronous
            }
  
            AsyncLock.prototype.acquire_original = function
          `,
        )

        return {
          code: transformedCode,
          map: null,
        }
      },
    },
    {
      name: 'promise-to-sync-promise',
      transform(oldCode, id) {
        let code = oldCode.replaceAll(/\bPromise\b/g, 'SyncPromise')
        if (!code.includes('const SyncPromise = ')) {
          code = `${syncPromiseSrc.replaceAll('export const SyncPromise', 'const SyncPromise').trim()}\n\n${code}`
        }
        return {
          code,
        }
      },
    },
  ],
}

export default config
