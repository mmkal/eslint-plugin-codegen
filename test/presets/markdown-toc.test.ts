import dedent from 'dedent'
import {test, expect, beforeEach} from 'vitest'
import * as preset from '../../src/presets/markdown-toc'
import {buildPresetParams, getFakeFs} from './meta'

const {fs, mockFs, reset} = getFakeFs()

beforeEach(() => {
  reset()
})

const params = buildPresetParams('readme.md', fs)

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
    "- [H2](#h2)
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
       - [H3](#h3)
       - [Another H3](#another-h3)
    - [Another H2](#another-h2)"
  `)
})

test('calculates min hashes', () => {
  Object.assign(mockFs, {
    'readme.md': dedent`
      # H1

      Intro

      ## First H2

      Description

      ## Second H2

      ### An H3
      ### Another H3
      #### Here's an H4
      ##### H5
      ##### Aitch Five
    `,
  })

  expect(
    preset.markdownTOC({
      ...params,
      options: {},
    }),
  ).toMatchInlineSnapshot(`
    "- [First H2](#first-h2)
    - [Second H2](#second-h2)
       - [An H3](#an-h3)
       - [Another H3](#another-h3)
          - [Here's an H4](#heres-an-h4)
             - [H5](#h5)
             - [Aitch Five](#aitch-five)"
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
    "- [First H2](#first-h2)
    - [Second H2](#second-h2)
       - [An H3](#an-h3)
       - [Another H3](#another-h3)"
  `)
})
