/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unicorn/prefer-module */
// eslint-disable-next-line unicorn/filename-case
/* eslint-disable no-console */
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
import dedent from 'dedent'
import {SpawnSyncOptionsWithBufferEncoding, spawnSync} from 'node:child_process'
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

    const exec = (command: string, options?: SpawnSyncOptionsWithBufferEncoding) =>
      spawnSync(command, {cwd: projectPath, stdio: 'inherit', shell: true, ...options})

    if (process.env.QUICKTIME_RECORD) {
      exec('osascript e2e/applescript/start-recording.applescript', {cwd: process.cwd()})
    }

    await use(workbox)

    let videoPath: string | undefined
    if (process.env.QUICKTIME_RECORD) {
      const before = new Date()
      exec('osascript e2e/applescript/stop-recording.applescript', {cwd: process.cwd()})
      const desktop = path.join(os.homedir(), 'Desktop')
      await new Promise(r => setTimeout(r, 3000)) // give it a few seconds to save
      const after = new Date()
      const desktopMovFiles = fs
        .readdirSync(desktop)
        .filter(f => f.endsWith('.mov'))
        .map(f => {
          const filepath = path.join(desktop, f)
          return {filepath, ctime: fs.statSync(filepath).ctime}
        })
        .filter(f => Date.now() - f.ctime.getTime() < 1000 * 60 * 60)
        .sort((a, b) => b.ctime.getTime() - a.ctime.getTime())
      const likelyFiles = desktopMovFiles.filter(f => f.ctime > before && f.ctime < after)
      if (likelyFiles.length !== 1) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(
          `Expected one file to be created between ${before.toISOString()} and ${after.toISOString()}, got ${JSON.stringify(desktopMovFiles, null, 2)}`,
        )
      }
      videoPath = likelyFiles[0].filepath
    }

    const tracePath = test.info().outputPath('trace.zip')
    await workbox.context().tracing.stop({path: tracePath})
    test.info().attachments.push({name: 'trace', path: tracePath, contentType: 'application/zip'})
    await electronApp.close()
    const logPath = path.join(defaultCachePath, 'user-data')
    const video = workbox.video()
    if (video) {
      videoPath ||= await video.path()
      const targetVideoPath = path.join(process.cwd(), 'test-results', 'videos', titleSlug + path.extname(videoPath))
      await fs.promises.cp(videoPath, targetVideoPath)
      exec(
        `${gifskiPath} --fps 32 ${targetVideoPath} -o ${path.join(process.cwd(), 'gifs', titleSlug + '.gif')} --quality 100`,
      )
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

      const editJson = (name: string, edit: (json: unknown) => void) => {
        const fullpath = path.join(projectPath, name)
        if (!fs.existsSync(fullpath)) {
          fs.mkdirSync(path.dirname(fullpath), {recursive: true})
          fs.cpSync(path.join(__dirname, '..', name), fullpath)
        }
        const json = JSON.parse(fs.readFileSync(fullpath, 'utf8')) as {}
        edit(json)
        fs.writeFileSync(fullpath, JSON.stringify(json, null, 2))
      }

      exec('npm init -y')
      exec(`pnpm install eslint@8 react@18 @types/react typescript tsx --save-dev`)

      editJson('tsconfig.json', (json: any) => {
        json.compilerOptions.jsx = 'react'
        json.include.push('node_modules/eslint-plugin-codegen')
      })
      write(
        'eslint.config.js',
        dedent`
          module.exports = [
            ...require(${JSON.stringify(path.join(__dirname, '..', 'eslint.config.js'))})
              .map(({rules, ...cfg}) => ({
                ...cfg,
              }))
              .filter(cfg => Object.keys(cfg).length > 0),
            {rules: {'codegen/codegen': 'warn'}},
          ]
        `,
      )

      write('src/barrel/a.ts', 'export const a = 1')
      write('src/barrel/b.ts', 'export const b = 1')
      write('src/barrel/index.ts', '')
      write('src/custom/index.ts', '')
      write('src/custom/component.tsx', '')
      write('README.md', 'Sample project')

      // use local eslint-plugin-codegen by inserting typescript directly into node_modules
      editJson('package.json', (json: any) => (json.devDependencies['eslint-plugin-codegen'] = '*'))
      write(
        'node_modules/eslint-plugin-codegen/index.ts',
        `export * from ${JSON.stringify(path.join(__dirname, '..', 'src'))}`,
      )

      editJson('.vscode/settings.json', (json: any) => {
        json['editor.inlineSuggest.enabled'] = false
        json['editor.autoClosingBrackets'] = 'never'
        json['editor.autoClosingQuotes'] = 'never'
        json['editor.autoIndent'] = 'none'
        json['editor.insertSpaces'] = false
        json['eslint.experimental.useFlatConfig'] = true
      })

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
