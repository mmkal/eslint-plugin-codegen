import {Page} from '@playwright/test'
import dedent from 'dedent'
import {test} from './base'

test.describe.configure({mode: 'serial'})

// https://github.com/microsoft/playwright/issues/28266 https://github.com/microsoft/playwright-vscode/tree/main/tests-integration

const _installEslint = async (page: Page) => {
  await page.getByRole('tab', {name: 'Extensions (⇧⌘X)'}).locator('a').click()
  await page.locator('.view-line').click()
  await page.getByLabel('The editor is not accessible').fill('eslint')
  await page.getByLabel('ESLint, 2.4.2, Verified').getByRole('button', {name: 'Install'}).click()
  await page.getByRole('tab', {name: 'Explorer (⇧⌘E)'}).locator('a').click()
  await page.getByLabel('Files Explorer').press('Meta+p')
  await page.getByPlaceholder('Search files by name (append').fill('index.ts')
  await page.getByPlaceholder('Search files by name (append').press('Enter')
}

async function openExistingFile(page: Page, name: string) {
  await new Promise(r => setTimeout(r, 500))
  await page.keyboard.press('Meta+p')
  await new Promise(r => setTimeout(r, 500))
  await page.keyboard.type(name)
  await new Promise(r => setTimeout(r, 500))
  await page.keyboard.press('Enter')
}

const codegen = async (page: Page, parameters: {file: string; type: () => Promise<void>; result: string}) => {
  await openExistingFile(page, parameters.file)

  await new Promise(r => setTimeout(r, 500))
  await page.keyboard.press('Meta+1')
  await parameters.type()
  await page.getByTitle('Show Code Actions. Preferred').click()
  await new Promise(r => setTimeout(r, 500))
  // await page.getByText('Fix all auto-fixable problems').click() // didn't work - loses focus somehow, so use Down-Down-Down-Enter instead 🤷‍♂️
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await new Promise(r => setTimeout(r, 1000))
  await page.keyboard.press('Enter')

  for (const line of parameters.result.split('\n')) {
    await page.getByText(line).first().waitFor({timeout: 1_000_000_000})
  }

  await new Promise(r => setTimeout(r, 1500))
  if (process.env.PAUSE) await new Promise(r => setTimeout(r, 1_000_000_000))
}

test.setTimeout(0)

test('barrel', async ({workbox: page}) => {
  await codegen(page, {
    file: 'barrel/index.ts',
    type: async () => page.keyboard.type('// codegen:start {preset: barrel}', {delay: 50}),
    result: dedent`
      // codegen:start {preset: barrel}
      export * from './a'
      export * from './b'
      // codegen:end
    `,
  })
})

test('markdownTOC', async ({workbox: page}) => {
  await codegen(page, {
    file: 'README.md',
    async type() {
      await page.keyboard.type(dedent`
        # foo package

        ## Table of contents

        ## Getting started

        ### Installation

        Install via npm:

        \`\`\`
        npm install foo
        \`\`\`

        ### Setup

        First, do a handstand. Then you are ready!

        ## Advanced usage

        Do a one-handed handstand.

        ## Troubleshooting

        If you can't do a handstand, try a headstand.

        ## FAQ

        Q: What if I can't do a headstand?
        A: Bad luck
      `)
      await page.keyboard.press('Meta+s')
      await page.getByText('Table of contents').click()
      await page.keyboard.press('Meta+ArrowRight')
      await page.keyboard.press('Enter')
      await page.keyboard.type('<!-- codegen:start {preset: markdownTOC} -->', {delay: 50})
      await new Promise(r => setTimeout(r, 500))
    },
    result: '#installation',
  })
})

test('custom', async ({workbox: page}) => {
  await codegen(page, {
    file: 'custom/component.tsx',
    async type() {
      await page.keyboard.type(
        dedent`
          import React from 'react'

          export const MyComponent = ({children}: {children: React.ReactNode}) => (
            <div>
              <h1>You have {devDependencies.length} dev dependencies</h1>\n
              <h2>Your readme is {readmeLength} characters long</h2>\n
              {children}
            </div>\n
          )\n

          export const myCodegen: import('eslint-plugin-codegen').Preset = ({
            dependencies: {fs, dedent},
          }) => {
            const readme = fs.readFileSync('README.md', 'utf8')
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
            const devDeps = Object.keys(packageJson.devDependencies)
            return dedent.default\`
              export const readmeLength = \${readme.length}

              export const devDependencies = \${JSON.stringify(devDeps, null, 6)}
            \`
          }
        `,
        {delay: 25},
      )

      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Meta+s')
      await new Promise(r => setTimeout(r, 500))

      await page.keyboard.type(dedent`
        // codegen:start {export: myCodegen}
      `)
    },
    result: 'export const readmeLength',
  })
})
