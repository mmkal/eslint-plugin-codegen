import * as preset from '../../src/presets/empty'

const emptyReadme = {filename: 'readme.md', existingContent: ''}

test('generates nothing', () => {
  expect(
    preset.empty({
      meta: emptyReadme,
      options: {},
    })
  ).toEqual('')
})
