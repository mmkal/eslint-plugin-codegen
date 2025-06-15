/* eslint-disable no-restricted-imports */
// this file will be bundled by tsup so that it can be used even in commonjs projects (some eslint bits still use commonjs)
export * as arktype from 'arktype'
// bundling this doesn't seem to work. you can try it out by uncommenting and running:
// pnpm build && node -e 'console.log(...Object.entries(require("./dist/esm-modules")).flat())'
// You'll get `Cannot convert undefined or null to object
// so just use zx instead
// export * as execa from 'execa'
