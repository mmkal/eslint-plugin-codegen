import * as recast from 'recast'
import {test, expect} from 'vitest'
import {PresetDependencies, dependencies} from '../src/dependencies'

const stripTypesTraverseOptions: import('@babel/traverse').TraverseOptions = {
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

const simplifyCodeTraverseOptions: import('@babel/traverse').TraverseOptions = {
  ...stripTypesTraverseOptions,
  // remove quotes from prop keys that don't need them like `{"foo": 1}` -> `{foo: 1}`
  ObjectProperty(path) {
    console.log(path.node)
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

  // remove comments
}

// eslint-disable-next-line @typescript-eslint/no-shadow
export function stripTypes(typeScriptCode: string, dependencies: PresetDependencies) {
  const {babelParser, babelTraverse, babelGenerator} = dependencies
  const ast = babelParser.parse(typeScriptCode, {
    sourceType: 'unambiguous',
    plugins: ['typescript'],
    attachComment: false,
  })

  babelTraverse.default(ast, simplifyCodeTraverseOptions)

  return babelGenerator.default(ast, {comments: true}).code
}

test('babel strip types', () => {
  const {dedent} = dependencies

  const typescriptCode = dedent`
    const fn: (a: string) => string = (a: string) => {
      type A = string
      interface B {}
      const f = <X extends string>(x: X) => [x] as const
      return a.slice(0, -1) as string
    }
  `

  expect(stripTypes(typescriptCode, dependencies)).toMatchInlineSnapshot(`
    "const fn = a => {
      const f = x => [x];
      return a.slice(0, -1);
    };"
  `)
})

test('babel parse then generate', async () => {
  const {dedent} = dependencies

  const leftCode = dedent`
    import {foo} from 'bar'

    export const a: {foo: string} = {foo}
  `

  const rightCode = dedent`
    import {foo} from "bar"

    /** sup */
    export const a = {
      // hello
      "foo": foo,
    }
  `

  const process = (code: string) => {
    const ast = dependencies.babelParser.parse(stripTypes(code, dependencies), {
      sourceType: 'unambiguous',
      plugins: ['typescript'],
    })
    dependencies.babelTraverse.default(ast, simplifyCodeTraverseOptions)
    return recast.prettyPrint(ast, {tabWidth: 2}).code

    // return dependencies.babelGenerator.default(ast, {comments: false}).code
  }

  expect(process(rightCode)).not.toContain(`"foo"`)

  expect(process(leftCode)).toMatchInlineSnapshot(`
    "import { foo } from "bar";

    export const a = {
      foo
    };"
  `)
  expect(process(rightCode)).toMatchInlineSnapshot(`
    "import { foo } from "bar";

    export const a = {
      foo
    };"
  `)

  expect(process(leftCode)).toBe(process(rightCode))
})
