import {Preset} from '.'
import dedent from 'dedent'
import {stripTypes} from '../simplify'
import {definePreset} from './util/standard-schema-preset'

export const _eval = definePreset({'comparison?': '"simplified" | "strict"'}, params => {
  const {dependencies, meta, options} = params
  const evalFnEnd = meta.existingContent.indexOf('\n}') + 3 // 3 not to capture either a semicolon or a newline. the trim will remove the newline but preserve the semicolon if it's wanted
  const fnStrWithComments = meta.existingContent.slice(0, evalFnEnd).trim()
  let fnStr = fnStrWithComments.trim()
  while (fnStr.endsWith(';')) fnStr = fnStr.slice(0, -1).trim()
  for (let i = 0; i < 100 && !fnStr.startsWith('const '); i++) {
    // we do have babel available, should we use that???? maybe one day
    const before = fnStr
    fnStr = fnStr.trim()
    if (fnStr.startsWith('//')) fnStr = fnStr.split('\n').slice(1).join('\n').trim()
    if (fnStr.startsWith('/*')) fnStr = fnStr.split('*/').slice(1).join('*/').trim()
    if (before === fnStr) break // the problem isn't comments or whitespace, give up
  }
  const exampleFn = dedent`
    const _myFn = () => {
      return '// abc123'
    }
  `
  const errorSuffix = `\n\nExample:\n\n${exampleFn}`
  if (!fnStr.startsWith('const ')) {
    throw new Error('Preset function must start with `const `.' + errorSuffix)
  }
  const functionName = fnStr.replace('const ', '').trim().split(/\b/)[0]
  if (!/^[$A-Z_a-z][\w$]*$/.test(functionName)) {
    throw new Error('Preset function must start with `const ` and have an identifier name.' + errorSuffix)
  }

  const plainJsFnStr = stripTypes(fnStr)

  const fnBody = [
    plainJsFnStr, // declare the function
    `return ${functionName}(params)`, // call it
  ].join(';\n\n')
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function('params', fnBody) as Preset<{}>
  const generated = fn(params)
  if (typeof generated !== 'string') {
    throw new Error('Preset function must return a string. Got: ' + typeof generated)
  }

  const expected = [
    fnStrWithComments, // keep the original function at the top
    '',
    fn(params),
  ].join('\n')

  if (expected === meta.existingContent) return meta.existingContent

  const comparison = options.comparison || 'simplified'
  const {equivalentSimplified} = dependencies.simplify
  if (comparison === 'simplified' && equivalentSimplified(meta.existingContent, expected)) {
    return meta.existingContent
  }

  return expected
})
