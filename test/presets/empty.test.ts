import * as preset from '../../src/presets/empty'
import {getMeta} from './meta'

const meta = getMeta(__filename)

const emptyReadme = {filename: 'readme.md', existingContent: ''}

test('generates nothing', () => {
  expect(
    preset.empty({
      meta: {...meta, ...emptyReadme},
      options: {},
    }),
  ).toEqual('')
})
