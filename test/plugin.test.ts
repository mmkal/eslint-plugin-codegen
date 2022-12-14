import dedent from 'dedent'
import {processors} from '../src'

describe('markdown processor', () => {
  const markdownProcessor = processors['.md']

  test('preprocessor comments out markdown', () => {
    const markdown = dedent`
      # Title

      <!-- comment -->

      <div>html</div>

      \`\`\`js
      // some javascript
      const x = 1
      \`\`\`
    `

    const preprocessed = markdownProcessor.preprocess!(markdown)

    expect(preprocessed).toMatchInlineSnapshot(`
      Array [
        "// eslint-plugin-codegen:trim# Title

      // eslint-plugin-codegen:trim<!-- comment -->

      // eslint-plugin-codegen:trim<div>html</div>

      // eslint-plugin-codegen:trim\`\`\`js
      // eslint-plugin-codegen:trim// some javascript
      // eslint-plugin-codegen:trimconst x = 1
      // eslint-plugin-codegen:trim\`\`\`",
      ]
    `)
  })

  test('postprocessor flattens message lists', () => {
    // @ts-expect-error missing some properties but they happen not to be needed
    const postprocessed = markdownProcessor.postprocess!([[{line: 1}], [{line: 2}]])

    expect(postprocessed).toEqual([{line: 1}, {line: 2}])
  })
})
