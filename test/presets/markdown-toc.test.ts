import dedent from 'dedent'
import * as preset from '../../src/presets/markdown-toc'
import {buildPresetParams} from './meta'

const mockFs: any = {}

beforeEach(() => {
  // eslint-disable-next-line mmkal/@typescript-eslint/no-dynamic-delete
  Object.keys(mockFs).forEach(k => delete mockFs[k])
})

jest.mock('fs', () => {
  const actual = jest.requireActual('fs')
  const reader =
    (orig: string) =>
    (...args: any[]) => {
      const path = args[0].replace(/\\/g, '/')
      // const fn = path in mockFs ? mockImpl : actual[orig]
      if (path in mockFs) {
        return mockFs[path]
      }

      return actual[orig](...args)
    }

  return {
    ...actual,
    readFileSync: reader('readFileSync'),
    existsSync: reader('existsSync'),
    readdirSync: (path: string) => Object.keys(mockFs).filter(k => k.startsWith(path.replace(/^\.\/?/, ''))),
    statSync: () => ({isFile: () => true, isDirectory: () => false}),
  }
})

const params = buildPresetParams('readme.md')

test('generate markdown', () => {
  Object.assign(mockFs, {
    'readme.md': dedent`
      # H1
      Text
      ## H2
      More text
      ### H3
      Some content
      ![](an-image.png)
      ### Another H3
      #### H4 duplicate
      ##### H5
      ##### H5
      #### H4 duplicate
      More
      ## Another H2
    `,
  })

  expect(
    preset.markdownTOC({
      ...params,
      options: {},
    }),
  ).toMatchInlineSnapshot(`
    "- [H1](#h1)
       - [H2](#h2)
          - [H3](#h3)
          - [Another H3](#another-h3)
             - [H4 duplicate](#h4-duplicate)
                - [H5](#h5)
                - [H5](#h5-1)
             - [H4 duplicate](#h4-duplicate-1)
       - [Another H2](#another-h2)"
  `)

  expect(
    preset.markdownTOC({
      ...params,
      options: {
        minDepth: 2,
        maxDepth: 3,
      },
    }),
  ).toMatchInlineSnapshot(`
    "- [H2](#h2)
    - [Another H2](#another-h2)"
  `)
})

test('calculates min hashes', () => {
  Object.assign(mockFs, {
    'readme.md': dedent`
      ### H3
      ### Another H3
      #### H4 duplicate
      ##### H5
      ##### H5
    `,
  })

  expect(
    preset.markdownTOC({
      ...params,
      options: {},
    }),
  ).toMatchInlineSnapshot(`
    "- [H3](#h3)
    - [Another H3](#another-h3)
       - [H4 duplicate](#h4-duplicate)
          - [H5](#h5)
          - [H5](#h5-1)"
  `)

  expect(
    preset.markdownTOC({
      ...params,
      options: {
        minDepth: 2,
        maxDepth: 3,
      },
    }),
  ).toMatchInlineSnapshot(`""`)
})
