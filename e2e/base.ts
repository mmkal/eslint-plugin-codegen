/* eslint-disable unicorn/prefer-module */
// eslint-disable-next-line unicorn/filename-case
/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
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
import {spawnSync} from 'node:child_process'
import dedent from 'dedent'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

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
    const titleSlug = slugify(test.info().title)
    const defaultCachePath = await createTempDir()
    const vscodePath = await downloadAndUnzipVSCode(vscodeVersion)
    const systemVscodeFolder = path.join(os.homedir(), '.vscode')
    const systemExtensionsDirectory = path.join(systemVscodeFolder, 'extensions')
    const gifskiPath = path.join(os.homedir(), 'Downloads/gifski-1.32.0/mac/gifski')
    const systemExtensionNames = await fs.promises.readdir(systemExtensionsDirectory)

    const systemEslintExtension = systemExtensionNames.find(child => child.startsWith('dbaeumer.vscode-eslint'))!
    const systemEslintExtensionPath = path.join(systemExtensionsDirectory, systemEslintExtension)

    await fs.promises.cp(systemEslintExtensionPath, path.join(defaultCachePath, 'extensions', systemEslintExtension), {
      recursive: true,
    })
    const projectPath = await createProject()
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
        projectPath,
      ],
      recordVideo: {
        dir: `test-results/videos/${titleSlug}`,
        // 942:707 is the default aspect ratio of the electron runner and I don't know how to change it.
        size: {width: 942 * 1.5, height: 707 * 1.5},
      },
    })
    const workbox = await electronApp.firstWindow()
    await workbox.context().tracing.start({screenshots: true, snapshots: true, title: test.info().title})
    await use(workbox)
    const tracePath = test.info().outputPath('trace.zip')
    await workbox.context().tracing.stop({path: tracePath})
    test.info().attachments.push({name: 'trace', path: tracePath, contentType: 'application/zip'})
    await electronApp.close()
    const logPath = path.join(defaultCachePath, 'user-data')
    const video = workbox.video()
    if (video) {
      const exec = (command: string) => spawnSync(command, {cwd: projectPath, stdio: 'inherit', shell: true})
      const videoPath = await video.path()
      exec(`${gifskiPath} --fps 32 -o ${path.join(process.cwd(), 'gifs', titleSlug + '.gif')} ${videoPath}`)
      await fs.promises.cp(videoPath, path.join(path.dirname(videoPath), 'recording.webm'))
    }

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
      exec(`pnpm install eslint@8 eslint-plugin-mmkal@0.7.0 react@18 @types/react typescript tsx --save-dev`)

      write(
        'tsconfig.json',
        fs
          .readFileSync(path.join(__dirname, '..', 'tsconfig.json'), 'utf8')
          .replace('"compilerOptions": {', `"compilerOptions": {\n    "jsx": "react", `),
      )
      write(
        'eslint.config.js',
        dedent`
          require('tsx/cjs')

          const src = require(${JSON.stringify(path.join(__dirname, '..', 'src'))})

          module.exports = [
            ...require('eslint-plugin-mmkal').recommendedFlatConfigs.filter(c => !c?.plugins?.codegen),
            {
              plugins: {
                codegen: {
                  rules: src.rules,
                }
              }
            },
            {
              files: ['*.ts', '*.tsx'],
              rules: {
                'codegen/codegen': 'error',
              },
            },
            {
              rules: {
                'unicorn/no-empty-file': 'off',
                'prettier/prettier': 'off',
              }
            }
          ]
        `,
      )

      write('src/barrel/a.ts', 'export const a = 1')
      write('src/barrel/b.ts', 'export const b = 1')
      write('src/barrel/index.ts', '')
      write('src/custom/index.ts', '')
      write('src/custom/component.tsx', '')
      write('README.md', '')

      write(
        '.vscode/settings.json',
        fs
          .readFileSync(path.join(__dirname, '../.vscode/settings.json'))
          .toString()
          .replace('{', '{\n  "editor.autoClosingBrackets": "never",')
          .replace('{', '{\n  "editor.autoIndent": "none",')
          .replace('{', '{\n  "editor.insertSpaces": false,')
          .replace('{', '{\n  "eslint.experimental.useFlatConfig": true,'),
      )

      return projectPath
    })
  },
  // eslint-disable-next-line no-empty-pattern
  async createTempDir({}, use) {
    const temporaryDirectories: string[] = []
    await use(async () => {
      const tempo = await fs.promises.realpath(await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pwtest-')))
      temporaryDirectories.push(tempo)
      return tempo
    })
    for (const tempo of temporaryDirectories) await fs.promises.rm(tempo, {recursive: true})
  },
})

const slugify = (string: string) => string.replaceAll(/\W+/g, ' ').trim().replaceAll(/\s+/g, '-')
