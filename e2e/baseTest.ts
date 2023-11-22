// eslint-disable-next-line mmkal/unicorn/filename-case
/* eslint-disable no-console */
/* eslint-disable mmkal/import/no-extraneous-dependencies */
/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {test as base, type Page, _electron} from '@playwright/test'
import {downloadAndUnzipVSCode} from '@vscode/test-electron/out/download'

export {expect} from '@playwright/test'
import {spawnSync} from 'child_process'
import dedent from 'dedent'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

export type TestOptions = {
  vscodeVersion: string
}

type TestFixtures = TestOptions & {
  workbox: Page
  createProject: () => Promise<string>
  createTempDir: () => Promise<string>
}

export const test = base.extend<TestFixtures>({
  vscodeVersion: ['insiders', {option: true}],
  async workbox({vscodeVersion, createProject, createTempDir}, use) {
    const defaultCachePath = await createTempDir()
    const vscodePath = await downloadAndUnzipVSCode(vscodeVersion)
    await fs.promises.cp(
      '/Users/mmkal/.vscode/extensions/dbaeumer.vscode-eslint-2.4.2',
      path.join(defaultCachePath, 'extensions', 'dbaeumer.vscode-eslint-2.4.2'),
      {recursive: true},
    )
    const electronApp = await _electron.launch({
      executablePath: vscodePath,
      args: [
        // Stolen from https://github.com/microsoft/vscode-test/blob/0ec222ef170e102244569064a12898fb203e5bb7/lib/runTest.ts#L126-L160
        // https://github.com/microsoft/vscode/issues/84238
        '--no-sandbox',
        // https://github.com/microsoft/vscode-test/issues/221
        '--disable-gpu-sandbox',
        // https://github.com/microsoft/vscode-test/issues/120
        '--disable-updates',
        '--skip-welcome',
        '--skip-release-notes',
        '--disable-workspace-trust',
        `--extensionDevelopmentPath=${path.join(__dirname, '..', '..')}`,
        `--extensions-dir=${path.join(defaultCachePath, 'extensions')}`,
        // `--extensions-dir=/Users/mmkal/.vscode/extensions`,
        `--user-data-dir=${path.join(defaultCachePath, 'user-data')}`,
        // `--install-extension=dbaeumer.vscode-eslint`,
        await createProject(),
      ],
      recordVideo: {dir: 'test-results/videos'},
    })
    const workbox = await electronApp.firstWindow()
    await workbox.context().tracing.start({screenshots: true, snapshots: true, title: test.info().title})
    await use(workbox)
    const tracePath = test.info().outputPath('trace.zip')
    await workbox.context().tracing.stop({path: tracePath})
    test.info().attachments.push({name: 'trace', path: tracePath, contentType: 'application/zip'})
    await electronApp.close()
    const logPath = path.join(defaultCachePath, 'user-data')
    if (fs.existsSync(logPath)) {
      const logOutputPath = test.info().outputPath('vscode-logs')
      await fs.promises.cp(logPath, logOutputPath, {recursive: true})
    }
  },
  async createProject({createTempDir}, use) {
    await use(async () => {
      // We want to be outside of the project directory to avoid already installed dependencies.
      const projectPath = await createTempDir()
      if (fs.existsSync(projectPath)) await fs.promises.rm(projectPath, {recursive: true})
      console.log(`Creating project in ${projectPath}`)
      await fs.promises.mkdir(projectPath)
      const exec = (command: string) => spawnSync(command, {cwd: projectPath, stdio: 'inherit', shell: true})
      const write = (name: string, content: string) => {
        const fullpath = path.join(projectPath, name)
        fs.mkdirSync(path.dirname(fullpath), {recursive: true})
        fs.writeFileSync(fullpath, content)
      }

      // exec(`npm init playwright@latest --yes -- --quiet --browser=chromium --gha --install-deps`)
      exec('npm init -y')
      exec(`pnpm install eslint eslint-plugin-codegen eslint-plugin-mmkal --save-dev`)

      write('tsconfig.json', fs.readFileSync(path.join(__dirname, '..', 'tsconfig.json'), 'utf8'))
      write(
        '.eslintrc.js',
        // parserOptions: {project: null} // this is more of an eslint-plugin-mmkal thing but typescript-eslint doesn't like the processor I've got
        // also, need to not pass fatal messages in the processor to eslint-plugin-markdown
        dedent`
          module.exports = {
            ...require('eslint-plugin-mmkal').getRecommended(),
            parserOptions: {project: null},
            plugins: ['codegen'],
            extends: ['plugin:codegen/recommended'],
            rules: {
              'mmkal/codegen/codegen': 'off',
              'codegen/codegen': 'warn',
            },
          }
        `,
      )

      write('src/a.ts', 'export const a = 1')
      write('src/b.ts', 'export const b = 1')
      write('src/index.ts', '')
      write('README.md', '')

      write('.vscode/settings.json', fs.readFileSync(path.join(__dirname, '../.vscode/settings.json')).toString())

      return projectPath
    })
  },
  // eslint-disable-next-line no-empty-pattern
  async createTempDir({}, use) {
    const tempDirs: string[] = []
    await use(async () => {
      const tempDir = await fs.promises.realpath(await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pwtest-')))
      tempDirs.push(tempDir)
      return tempDir
    })
    for (const tempDir of tempDirs) await fs.promises.rm(tempDir, {recursive: true})
  },
})
