import dedent from 'dedent'
import {test, expect, beforeEach, vi as jest} from 'vitest'
import * as preset from '../../src/presets/markdown-toc'
import {buildPresetParams} from './meta'

const mockFs: any = {}

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  Object.keys(mockFs).forEach(k => delete mockFs[k])
})

jest.mock('fs', async () => {
  const actual: any = await jest.importActual('fs')
  const reader =
    (orig: string) =>
    (...args: any[]) => {
      const path = args[0].replaceAll('\\', '/')
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
    "- [Motivation](#motivation)
    - [Contents](#contents)
    - [How to use](#how-to-use)
       - [Setup](#setup)
          - [Usage with eslint-plugin-markdown](#usage-with-eslint-plugin-markdown)
       - [Presets](#presets)
          - [barrel](#barrel)
             - [Example](#example)
             - [Params](#params)
             - [Demo](#demo)
          - [custom](#custom)
             - [Example](#example-1)
             - [Params](#params-1)
             - [Demo](#demo-1)
          - [markdownFromJsdoc](#markdownfromjsdoc)
             - [Example](#example-2)
             - [Params](#params-2)
          - [monorepoTOC](#monorepotoc)
             - [Example (basic)](#example-basic)
             - [Example (using config options)](#example-using-config-options)
             - [Params](#params-3)
             - [Demo](#demo-2)
          - [markdownFromJsdoc](#markdownfromjsdoc-1)
             - [Example](#example-3)
             - [Params](#params-4)
             - [Demo](#demo-3)
          - [markdownTOC](#markdowntoc)
             - [Example](#example-4)
             - [Params](#params-5)
             - [Demo](#demo-4)
          - [markdownFromTests](#markdownfromtests)
             - [Example](#example-5)
             - [Params](#params-6)
             - [Demo](#demo-5)
          - [labeler](#labeler)
             - [Example](#example-6)
             - [Params](#params-7)
             - [Demo](#demo-6)
       - [Customisation](#customisation)"
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
    "- [Motivation](#motivation)
    - [Contents](#contents)
    - [How to use](#how-to-use)"
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
    "- [Motivation](#motivation)
    - [Contents](#contents)
    - [How to use](#how-to-use)
       - [Setup](#setup)
          - [Usage with eslint-plugin-markdown](#usage-with-eslint-plugin-markdown)
       - [Presets](#presets)
          - [barrel](#barrel)
             - [Example](#example)
             - [Params](#params)
             - [Demo](#demo)
          - [custom](#custom)
             - [Example](#example-1)
             - [Params](#params-1)
             - [Demo](#demo-1)
          - [markdownFromJsdoc](#markdownfromjsdoc)
             - [Example](#example-2)
             - [Params](#params-2)
          - [monorepoTOC](#monorepotoc)
             - [Example (basic)](#example-basic)
             - [Example (using config options)](#example-using-config-options)
             - [Params](#params-3)
             - [Demo](#demo-2)
          - [markdownFromJsdoc](#markdownfromjsdoc-1)
             - [Example](#example-3)
             - [Params](#params-4)
             - [Demo](#demo-3)
          - [markdownTOC](#markdowntoc)
             - [Example](#example-4)
             - [Params](#params-5)
             - [Demo](#demo-4)
          - [markdownFromTests](#markdownfromtests)
             - [Example](#example-5)
             - [Params](#params-6)
             - [Demo](#demo-5)
          - [labeler](#labeler)
             - [Example](#example-6)
             - [Params](#params-7)
             - [Demo](#demo-6)
       - [Customisation](#customisation)"
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
    "- [Motivation](#motivation)
    - [Contents](#contents)
    - [How to use](#how-to-use)"
  `)
})
