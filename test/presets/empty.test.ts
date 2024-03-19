import * as preset from '../../src/presets/empty'
import {buildPresetParams} from './meta'
import {test, expect} from 'vitest'

const params = buildPresetParams(__filename)

const emptyReadme = {filename: 'readme.md', existingContent: ''}

test('generates nothing', () => {
  expect(
    preset.empty({
      ...params,
      meta: {...params.meta, ...emptyReadme},
      options: {},
    }),
  ).toEqual('')
})
