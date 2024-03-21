import type {Preset} from '.'
import {parse} from '@babel/parser'
import traverse from '@babel/traverse'
import {Node} from '@babel/types'
import * as lodash from 'lodash'
import * as os from 'os'
import * as path from 'path'

/**
 * Convert jsdoc for an es export from a javascript/typescript file to markdown.
 *
 * ##### Example
 *
 * `<!-- codegen:start {preset: markdownFromJsdoc, source: src/foo.ts, export: bar} -->`
 *
 * @param source {string} relative file path containing the export with jsdoc that should be copied to markdown
 * @param export {string} the name of the export
 * @param headerLevel {1|2|3|4|5} Determines if the export will correspond to a H1, H2, H3, H4 or H5. Nested headers will increment from this value. @default 4
 */
export const markdownFromJsdoc: Preset<{source: string; export?: string; headerLevel?: number}> = ({
  meta,
  options: {source: relativeFile, export: exportName, headerLevel = 4},
  dependencies: {fs},
}) => {
  const targetFile = path.join(path.dirname(meta.filename), relativeFile)
  const sourceCode = fs.readFileSync(targetFile).toString()
  const ast = parse(sourceCode, {sourceType: 'module', plugins: ['typescript']})
  const idable = {} as Record<string, Node>
  traverse(ast, {
    ExportNamedDeclaration({node: decl}) {
      switch (decl.declaration?.type) {
        case 'ClassDeclaration': {
          idable[decl.declaration.id.name] = decl as Node
          for (const node of decl.declaration.body.body) {
            if (node.type === 'ClassPrivateMethod' || node.type === 'ClassPrivateProperty') continue
            if ('key' in node && 'name' in node.key) {
              idable[`${decl.declaration.id.name}: ${node.key.name}`] = node as Node
            }
          }
          break
        }
        case 'VariableDeclaration': {
          for (const d of decl.declaration.declarations) {
            if (d.id.type !== 'Identifier') continue
            idable[d.id.name] = decl as Node
          }
          break
        }
        default: {
          if (decl.declaration && 'id' in decl.declaration && 'name' in decl.declaration.id!) {
            idable[decl.declaration.id.name] = decl as Node
          }
        }
      }
    },
  })

  const h = (n: number) => '#'.repeat(n)

  const formatNode = (name: string, node: Node) => {
    const parts = name.split(': ')
    const level = headerLevel + parts.length - 1
    const contentUpToExport = node.leadingComments?.map(c => c.value).join('\n\n') || ''
    const jsdoc = contentUpToExport
      .split('\n')
      .map(line => line.trim())
      .map(line => {
        return line
          .replace(/^\/\*\*$/, '') // clean up: /**
          .replaceAll(/^\* /g, '') // clean up:     * blah
          .replaceAll(/^\*$/g, '') // clean up:     *
          .replace(/^\*\/$/, '') // clean up     */
      })
      .join(os.EOL)
    const sections = `\n@description ${jsdoc}`
      .split(/\n@/)
      .map(section => section.trim() + ' ')
      .filter(Boolean)
      .map((section, index) => {
        const firstSpace = section.search(/\s/)
        return {type: section.slice(0, firstSpace), index, content: section.slice(firstSpace).trim()}
      })
      .filter(s => s.content)

    const formatted = sections.map((sec, i, arr) => {
      if (sec.type === 'example') {
        return [h(level + 1) + ' Example', '', '```typescript', sec.content, '```'].join(os.EOL)
      }

      if (sec.type === 'param') {
        const allParams = arr.filter(other => other.type === sec.type)
        if (sec !== allParams[0]) {
          return null
        }

        const rows = allParams.map((p): [string, string] => {
          const whitespaceMatch = /\s/.exec(p.content)
          const firstSpace = whitespaceMatch ? whitespaceMatch.index : p.content.length
          const rowName = p.content.slice(0, firstSpace)
          const description = p.content
            .slice(firstSpace + 1)
            .trim()
            .replaceAll(/\r?\n/g, '<br />')
          return [rowName, description]
        })

        const headers: [string, string] = ['name', 'description']

        const nameSize = lodash.max([headers, ...rows].map(r => r[0].length))!
        const descSize = lodash.max([headers, ...rows].map(r => r[1].length))!
        const pad = (tuple: [string, string], padding = ' ') =>
          `|${tuple[0].padEnd(nameSize, padding)}|${tuple[1].padEnd(descSize, padding)}|`

        return [
          h(level + 1) + ' Params', // breakme
          '',
          pad(headers),
          pad(['', ''], '-'),
          ...rows.map(tuple => pad(tuple)),
        ].join(os.EOL)
      }

      if (sec.type === 'description') {
        // line breaks that run into letters aren't respected by jsdoc, so shouldn't be in markdown either
        return sec.content.replaceAll(/\r?\n\s*([A-Za-z])/g, ' $1')
      }

      if (sec.type === 'see') {
        return null
      }

      return [`${h(level + 1)} ${lodash.startCase(sec.type)}`, sec.content].join(os.EOL + os.EOL)
    })
    return [`${h(level)} [${parts.at(-1)}](./${relativeFile}#L${node.loc?.start.line || 1})`, ...formatted]
      .filter(Boolean)
      .join(os.EOL + os.EOL)
  }

  const blocks = Object.entries(idable)
    .map(([name, node]) => {
      if (exportName && name !== exportName) return ''
      return formatNode(name, node)
    })
    .filter(Boolean)

  if (blocks.length === 0 && exportName) {
    throw new Error(`Couldn't find export in ${targetFile} with jsdoc called ${exportName}`)
  }

  return blocks.join('\n\n')
}
