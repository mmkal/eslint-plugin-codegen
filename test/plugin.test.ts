import dedent from 'dedent'
import {test, expect, describe} from 'vitest'
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

    const preprocessed = markdownProcessor.preprocess!(markdown, 'test.md')

    expect(preprocessed).toMatchInlineSnapshot(`
      [
        {
          "filename": "codegen-commented-out.js",
          "text": "// eslint-plugin-codegen:trim# Title

      // eslint-plugin-codegen:trim<!-- comment -->

      // eslint-plugin-codegen:trim<div>html</div>

      // eslint-plugin-codegen:trim\`\`\`js
      // eslint-plugin-codegen:trim// some javascript
      // eslint-plugin-codegen:trimconst x = 1
      // eslint-plugin-codegen:trim\`\`\`",
        },
        {
          "filename": "0.js",
          "text": "// some javascript
      const x = 1
      ",
        },
      ]
    `)
  })
})
