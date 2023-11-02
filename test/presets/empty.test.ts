import * as preset from '../../src/presets/empty'
import {meta} from './meta'

const emptyReadme = {filename: 'readme.md', existingContent: ''}

test('generates nothing', () => {
  expect(
    preset.empty({
      meta: {...meta, ...emptyReadme},
      options: {},
    }),
  ).toEqual('')
})
