import {Preset, PresetDependencies} from '.'
import {definePreset} from './util/standard-schema-preset'

export const _eval = definePreset({'comparison?': '"simplified" | "strict"'}, params => {
  const {dependencies, meta, options} = params
  const evalFnEnd = meta.existingContent.indexOf('\n}') + 2
  const fnStrWithComments = meta.existingContent.slice(0, evalFnEnd).trim()
  let fnStr = fnStrWithComments
  while (fnStr.startsWith('//')) {
    fnStr = fnStr.split('\n').slice(1).join('\n')
  }
  while (fnStr.startsWith('/*')) {
    fnStr = fnStr.split('*/').slice(1).join('*/')
  }
  fnStr = fnStr.slice(0, evalFnEnd)
  if (!fnStr.startsWith('const ')) {
    throw new Error('Preset function must start with `const `')
  }
  const functionName = fnStr.replace('const ', '').trim().split(/\b/)[0]
  if (!functionName) {
    throw new Error('Preset function must have a variable name')
  }

  const plainJsFnStr = stripTypes(fnStr, dependencies)

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

export function stripTypes(typeScriptCode: string, dependencies: PresetDependencies) {
  const {babelParser, babelTraverse, babelGenerator} = dependencies
  const ast = babelParser.parse(typeScriptCode, {
    sourceType: 'unambiguous',
    plugins: ['typescript'],
  })

  babelTraverse.default(ast, {
    // Remove type annotations from function parameters
    Function(path) {
      if (path.node.params) {
        path.node.params.forEach(param => {
          if ('typeAnnotation' in param) {
            param.typeAnnotation = null
          }
        })
      }
      // Remove return type annotation
      if (path.node.returnType) {
        path.node.returnType = null
      }
    },

    // Remove type annotations from variable declarations
    VariableDeclarator(path) {
      if (path.node.id && 'typeAnnotation' in path.node.id) {
        path.node.id.typeAnnotation = null
      }
    },

    // Handle satisfies expressions
    TSSatisfiesExpression(path) {
      path.replaceWith(path.node.expression)
    },

    // Handle type assertions
    TSAsExpression(path) {
      path.replaceWith(path.node.expression)
    },

    TSTypeAssertion(path) {
      path.replaceWith(path.node.expression)
    },

    // Remove type-only imports/exports
    ImportDeclaration(path) {
      if (path.node.importKind === 'type') {
        path.remove()
      }
    },

    ExportNamedDeclaration(path) {
      if (path.node.exportKind === 'type') {
        path.remove()
      }
    },

    // Remove type declarations entirely
    TSTypeAliasDeclaration(path) {
      path.remove()
    },

    TSInterfaceDeclaration(path) {
      path.remove()
    },

    TSEnumDeclaration(path) {
      throw new Error(
        `Can't strip enums. Please don't use them. Found:\n\n${babelGenerator.default(path.node, {comments: true}).code}`,
      )
    },

    ClassMethod(path) {
      if (path.node.kind === 'constructor') {
        path.node.params.forEach(param => {
          if ('accessibility' in param || 'readonly' in param) {
            throw new Error(
              `Can't strip parameter properties (public/private/protected/readonly). Please don't use them. Found:\n\n${babelGenerator.default(path.node, {comments: true}).code}`,
            )
          }
        })
      }
    },

    TSModuleDeclaration(path) {
      path.remove()
    },

    // Remove non-null assertions (!)
    TSNonNullExpression(path) {
      path.replaceWith(path.node.expression)
    },

    // Remove type parameters from functions/classes
    TSTypeParameterDeclaration(path) {
      path.remove()
    },

    // Remove type parameters from call expressions
    CallExpression(path) {
      if (path.node.typeParameters) {
        path.node.typeParameters = null
      }
    },

    NewExpression(path) {
      if (path.node.typeParameters) {
        path.node.typeParameters = null
      }
    },

    // Remove definite assignment assertions (!)
    AssignmentPattern(path) {
      if (path.node.left && 'definite' in path.node.left && path.node.left.definite) {
        path.node.left.definite = false
      }
    },
  })

  return babelGenerator.default(ast, {comments: true}).code
}
