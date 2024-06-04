import {createHash} from 'crypto'
import type * as eslint from 'eslint'
import expect from 'expect'
import {tryCatch} from 'fp-ts/lib/Either'
import {globSync} from 'glob'
import * as jsYaml from 'js-yaml'
import * as os from 'os'
import * as path from 'path'
import {inspect} from 'util'
import {dependencies} from './dependencies'
import * as presetsModule from './presets'

export const codegen: eslint.Rule.RuleModule = {
  // @ts-expect-error types are wrong?
  meta: {fixable: true},
  create(context: eslint.Rule.RuleContext) {
    const validate = () => {
      const sourceCode = context.sourceCode.text
        .split(os.EOL)
        .map(line => `${line}`.replace('// eslint-plugin-codegen:trim', ''))
        .join(os.EOL)

      const baseMarkersByExtension = {
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
      } satisfies Record<string, {start: RegExp; end: RegExp}>

      const markersByExtension: Record<string, {start: RegExp; end: RegExp}> = {
        ...baseMarkersByExtension,
        '.tsx': baseMarkersByExtension['.ts'],
        '.cts': baseMarkersByExtension['.ts'],
        '.mts': baseMarkersByExtension['.ts'],
        '.js': baseMarkersByExtension['.ts'],
        '.cjs': baseMarkersByExtension['.ts'],
        '.mjs': baseMarkersByExtension['.ts'],
        '.jsx': baseMarkersByExtension['.ts'],
        '.yaml': baseMarkersByExtension['.yml'],
        '.mdx': baseMarkersByExtension['.md'],
        '.txt': baseMarkersByExtension['.yml'],
        '.sh': baseMarkersByExtension['.yml'],
      }

      const markers = markersByExtension[path.extname(context.physicalFilename)]
      if (!markers) {
        throw new Error(`codegen doesn't support ${context.physicalFilename}`)
      }

      const position = (index: number) => {
        const stringUpToPosition = sourceCode.slice(0, index)
        const lines = stringUpToPosition.split(os.EOL)
        return {line: lines.length, column: lines.at(-1)!.length}
      }

      const startMatches = [...sourceCode.matchAll(markers.start)].filter(startMatch => {
        const prevCharacter = sourceCode[startMatch.index! - 1]
        return !prevCharacter || prevCharacter === '\n'
      })

      startMatches.forEach((startMatch, startMatchesIndex) => {
        const startIndex = startMatch.index!.valueOf()
        const start = position(startIndex)
        const startMarkerLoc = {start, end: {...start, column: start.column + startMatch[0].length}}
        const searchForEndMarkerUpTo =
          startMatchesIndex === startMatches.length - 1 ? sourceCode.length : startMatches[startMatchesIndex + 1].index
        const endMatch = [...sourceCode.slice(0, searchForEndMarkerUpTo).matchAll(markers.end)].find(
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
                os.EOL + markers.end.source.replaceAll('\\', ''),
              ),
          })
          return
        }

        const maybeOptions = tryCatch(
          () => jsYaml.safeLoad(startMatch[1]) as Record<string, unknown>,
          err => err,
        )
        if (maybeOptions._tag === 'Left') {
          context.report({message: `Error parsing options. ${maybeOptions.left as string}`, loc: startMarkerLoc})
          return
        }

        const opts = maybeOptions.right || {}
        const presets: Record<string, presetsModule.Preset | undefined> = {
          ...presetsModule,
          ...context.options[0]?.presets,
        } as {}
        const preset = typeof opts?.preset === 'string' ? presets[opts.preset] : undefined
        if (typeof preset !== 'function') {
          context.report({
            message: `unknown preset ${opts.preset as string}. Available presets: ${Object.keys(presets).join(', ')}`,
            loc: startMarkerLoc,
          })
          return
        }

        const range: eslint.AST.Range = [startIndex + startMatch[0].length + os.EOL.length, endMatch.index!]
        const existingContent = sourceCode.slice(...range)

        const meta: presetsModule.PresetMeta = {
          filename: context.physicalFilename,
          existingContent,
          glob: globSync as never,
          fs: dependencies.fs,
          path,
        }
        const parameters = {meta, options: opts, context, dependencies}

        const sourceCodeWithoutExistingContent = sourceCode.slice(0, range[0]) + sourceCode.slice(range[1])
        const hashableInputs = {
          filename: context.physicalFilename,
          sourceCodeWithoutExistingContent,
          parameters,
        }
        const inputHash = createHash('md5')
          .update(inspect(hashableInputs, {depth: 10}))
          .digest('hex')
        const existingResultHashHeader = existingContent
          .trim()
          .split('\n')[0]
          ?.match(/codegen:hash {(.*)}/)
        const existingResultHash =
          existingResultHashHeader && (jsYaml.load(existingResultHashHeader?.[1]) as {input: string; output: string})

        const existingContentOutputHash = existingResultHashHeader
          ? createHash('md5')
              .update(JSON.stringify(existingContent.split(existingResultHashHeader?.[0])[1].trim()))
              .digest('hex')
          : undefined

        const contentUpToDate =
          existingContentOutputHash &&
          existingResultHash?.input === inputHash &&
          existingContentOutputHash === existingResultHash?.output

        const normalise = (val: string) => val.trim().replaceAll(/\r?\n/g, os.EOL)
        const hasNonWhitespace = (s: string) => /\S/.test(s)
        const result = tryCatch(
          () => {
            if (contentUpToDate && hasNonWhitespace(existingContent)) return existingContent
            return preset(parameters)
          },
          err => `${err as string}`,
        )

        if (result._tag === 'Left') {
          context.report({message: result.left, loc: startMarkerLoc})
          return
        }

        const outputHash = createHash('md5').update(JSON.stringify(result.right.trim())).digest('hex')
        const resultHashHeader = `codegen:hash {input: ${inputHash}, output=${outputHash}}`

        const hashComment =
          markers === baseMarkersByExtension['.md']
            ? `<!-- ${resultHashHeader} -->`
            : markers === baseMarkersByExtension['.yml']
              ? `# ${resultHashHeader}`
              : `// ${resultHashHeader}`
        const expected = hasNonWhitespace(result.right) ? [hashComment, result.right].join('\n') : result.right
        try {
          expect(normalise(existingContent)).toBe(normalise(expected))
        } catch (e: unknown) {
          const loc = {start: position(range[0]), end: position(range[1])}
          context.report({
            message: `content doesn't match: ${e as string}`,
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
