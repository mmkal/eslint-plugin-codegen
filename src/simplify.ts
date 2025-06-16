import * as babelGenerator from '@babel/generator'
import * as babelParser from '@babel/parser'
import * as babelTraverse from '@babel/traverse'
import * as recast from 'recast'

/**
 * returns true if the simplified versions of the two strings are the same
 * can be useful if you want to know if two large blocks of code are equivalent - note that
 * in theory this could return false positives for totally different inputs, since it ignores
 * all formatting, punctuation, etc. V unlikely that you'll have two different inputs with the
 * exact same letters in the same order, but different meanings.
 */
export const equivalentSimplified = (left: string, right: string) => {
  if (left === right) return true
  if (/\S/.test(left) !== /\S/.test(right)) return false // if one is just whitespace but the other isn't, don't consider them equivalent
  try {
    return simplifyCode(left) === simplifyCode(right)
  } catch {
    return false
  }
}

export const stripTypesTraverseOptions: import('@babel/traverse').TraverseOptions = {
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
}

export const simplifyCodeTraverseOptions: import('@babel/traverse').TraverseOptions = {
  ...stripTypesTraverseOptions,
  // remove quotes from prop keys that don't need them like `{"foo": 1}` -> `{foo: 1}`
  ObjectProperty(path) {
    if (
      path.node.key.type === 'StringLiteral' &&
      path.node.key.extra &&
      typeof path.node.key.extra.rawValue === 'string' &&
      /^[$A-Z_a-z][\w$]*$/.test(path.node.key.extra.rawValue)
    ) {
      path.node.key.extra.raw = path.node.key.extra?.rawValue
    }

    if (
      path.node.key.type === 'Identifier' &&
      path.node.value.type === 'Identifier' &&
      path.node.key.name === path.node.value.name
    ) {
      // make it shorthand
      path.node.shorthand = true
    }
  },
}

export function stripTypes(typeScriptCode: string) {
  const ast = babelParser.parse(typeScriptCode, {
    sourceType: 'unambiguous',
    plugins: ['typescript'],
    attachComment: false,
  })

  babelTraverse.default(ast, stripTypesTraverseOptions)

  return babelGenerator.default(ast, {comments: true}).code
}

export function simplifyCode(code: string) {
  let ast = babelParser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['typescript'],
    attachComment: false,
  })
  babelTraverse.default(ast, simplifyCodeTraverseOptions)

  // modifications made are only respected by babel - so we generate using babel, parse again, then generate using recast to prettify
  ast = babelParser.parse(babelGenerator.default(ast).code, {
    sourceType: 'unambiguous',
    plugins: ['typescript'],
    attachComment: false,
  })
  babelTraverse.default(ast, simplifyCodeTraverseOptions)

  return recast.prettyPrint(ast, {
    tabWidth: 2,
    useTabs: false,
    trailingComma: true,
    objectCurlySpacing: true,
    flowObjectCommas: true,
    arrayBracketSpacing: false,
    arrowParensAlways: true,
    quote: 'single',
  }).code
}
