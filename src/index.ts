/* eslint-disable mmkal/@typescript-eslint/restrict-template-expressions */
import type * as eslint from 'eslint'

import expect from 'expect'
import {tryCatch} from 'fp-ts/lib/Either'
import * as fs from 'fs'
import {globSync} from 'glob'
import * as jsYaml from 'js-yaml'
import * as os from 'os'
import * as path from 'path'
import * as presetsModule from './presets'

// eslint-disable-next-line mmkal/@typescript-eslint/no-require-imports, mmkal/@typescript-eslint/no-var-requires
const eslintPluginMarkdownProcessor: eslint.Linter.Processor = require('eslint-plugin-markdown/lib/processor')

// idea: codegen/fs rule. type fs.anything and it generates an import for fs. same for path and os.

type MatchAll = (text: string, pattern: string | RegExp) => Iterable<NonNullable<ReturnType<string['match']>>>
// eslint-disable-next-line mmkal/@typescript-eslint/no-var-requires, mmkal/@typescript-eslint/no-require-imports
const matchAll: MatchAll = require('string.prototype.matchall')

export type {Preset} from './presets'

const codegenMarkdownCommentedOutFile = 'codegen-commented-out.md'

const getPreprocessor = (): eslint.Linter.Processor => {
  return {
    preprocess: (text, filename) => [
      ...eslintPluginMarkdownProcessor.preprocess!(text, filename),
      {
        filename: codegenMarkdownCommentedOutFile,
        text: text
          .split(/\r?\n/)
          .map(line => line && `// eslint-plugin-codegen:trim${line}`)
          .join(os.EOL),
      },
    ],
    postprocess(messageLists, filename) {
      if (filename === codegenMarkdownCommentedOutFile) {
        return messageLists.flat()
      }

      return eslintPluginMarkdownProcessor.postprocess!(messageLists, filename)
    },
    supportsAutofix: true,
  }
}

export const processors: Record<string, eslint.Linter.Processor> = {
  '.md': getPreprocessor(),
  '.yml': getPreprocessor(),
  '.yaml': getPreprocessor(),
}

const codegen: eslint.Rule.RuleModule = {
  // @ts-expect-error types are wrong?
  meta: {fixable: true},
  create(context: eslint.Rule.RuleContext) {
    const validate = () => {
      const basename = path.basename(context.getFilename())
      if (basename !== codegenMarkdownCommentedOutFile) {
        return
      }

      const sourceCode = context.sourceCode.text
        .split(os.EOL)
        .map(line => `${line}`.replace('// eslint-plugin-codegen:trim', ''))
        .join(os.EOL)

      const markersByExtension: Record<string, {start: RegExp; end: RegExp}> = {
        '.md': {
          start: /<!-- codegen:start (.*?) ?-->/g,
          end: /<!-- codegen:end -->/g,
        },
        '.ts': {
          start: /\/\/ codegen:start ?(.*)/g,
          end: /\/\/ codegen:end/g,
        },
        '.yml': {
          start: /# codegen:start ?(.*)/g,
          end: /# codegen:end/g,
        },
      }
      markersByExtension['.cts'] = markersByExtension['.ts']
      markersByExtension['.mts'] = markersByExtension['.ts']
      markersByExtension['.tsx'] = markersByExtension['.ts']
      markersByExtension['.js'] = markersByExtension['.ts']
      markersByExtension['.cjs'] = markersByExtension['.ts']
      markersByExtension['.mjs'] = markersByExtension['.ts']
      markersByExtension['.jsx'] = markersByExtension['.ts']
      markersByExtension['.yaml'] = markersByExtension['.yml']

      const markers = markersByExtension[path.extname(context.getFilename())]
      const position = (index: number) => {
        const stringUpToPosition = sourceCode.slice(0, index)
        const lines = stringUpToPosition.split(os.EOL)
        return {line: lines.length, column: lines[lines.length - 1].length}
      }

      const startMatches = [...matchAll(sourceCode, markers.start)].filter(startMatch => {
        const prevCharacter = sourceCode[startMatch.index! - 1]
        return !prevCharacter || prevCharacter === '\n'
      })

      startMatches.forEach((startMatch, startMatchesIndex) => {
        const startIndex = startMatch.index!.valueOf()
        const start = position(startIndex)
        const startMarkerLoc = {start, end: {...start, column: start.column + startMatch[0].length}}
        const searchForEndMarkerUpTo =
          startMatchesIndex === startMatches.length - 1 ? sourceCode.length : startMatches[startMatchesIndex + 1].index
        const endMatch = [...matchAll(sourceCode.slice(0, searchForEndMarkerUpTo), markers.end)].find(
          e => e.index! > startMatch.index!,
        )
        if (!endMatch) {
          const afterStartMatch = startIndex + startMatch[0].length
          context.report({
            message: `couldn't find end marker (expected regex ${markers.end})`,
            loc: startMarkerLoc,
            fix: fixer =>
              fixer.replaceTextRange(
                [afterStartMatch, afterStartMatch],
                os.EOL + markers.end.source.replace(/\\/g, ''),
              ),
          })
          return
        }

        const maybeOptions = tryCatch(
          () => jsYaml.safeLoad(startMatch[1]) as Record<string, unknown>,
          err => err,
        )
        if (maybeOptions._tag === 'Left') {
          context.report({message: `Error parsing options. ${maybeOptions.left}`, loc: startMarkerLoc})
          return
        }

        const opts = maybeOptions.right || {}
        const presets: Record<string, presetsModule.Preset<unknown> | undefined> = {
          ...presetsModule,
          ...context.options[0]?.presets,
        }
        const preset = typeof opts?.preset === 'string' && presets[opts.preset]
        if (typeof preset !== 'function') {
          context.report({
            message: `unknown preset ${opts.preset}. Available presets: ${Object.keys(presets).join(', ')}`,
            loc: startMarkerLoc,
          })
          return
        }

        const range: eslint.AST.Range = [startIndex + startMatch[0].length + os.EOL.length, endMatch.index!]
        const existingContent = sourceCode.slice(...range)
        const normalise = (val: string) => val.trim().replace(/\r?\n/g, os.EOL)

        const format = tryCatch(
          () => {
            // eslint-disable-next-line mmkal/import/no-extraneous-dependencies, mmkal/@typescript-eslint/no-require-imports, mmkal/@typescript-eslint/no-var-requires
            const prettier = require('prettier') as typeof import('prettier')
            return (input: string) => prettier.format(input, {filepath: context.getFilename()})
          },
          e => (input: string) => {
            const msg = `Encountered error ${e} trying to format using prettier. No formatting will be applied. Try installing prettier, or live without auto-formatting`
            context.report({message: msg, loc: startMarkerLoc})
            return input
          },
        )

        const result = tryCatch(
          () => {
            const meta: presetsModule.PresetMeta = {
              filename: context.getFilename(),
              existingContent,
              glob: globSync,
              format: format._tag === 'Right' ? format.right : format.left,
              fs,
              path,
            }
            return preset({meta, options: opts})
          },
          err => `${err}`,
        )

        if (result._tag === 'Left') {
          context.report({message: result.left, loc: startMarkerLoc})
          return
        }

        const expected = result.right
        try {
          expect(normalise(existingContent)).toBe(normalise(expected))
        } catch (e: unknown) {
          const loc = {start: position(range[0]), end: position(range[1])}
          context.report({
            message: `content doesn't match: ${e}`,
            loc,
            fix: fixer => fixer.replaceTextRange(range, normalise(expected) + os.EOL),
          })
        }
      })
    }

    validate()
    return {}
  },
}

export const rules = {codegen}

export * as presets from './presets'
