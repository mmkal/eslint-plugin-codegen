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
// eslint-disable-next-line mmkal/import/no-extraneous-dependencies
import {defineConfig} from '@playwright/test'
import {TestOptions} from './e2e/baseTest'

export default defineConfig<void, TestOptions>({
  reporter: process.env.CI ? 'html' : 'list',
  timeout: 120_000,
  workers: 1,
  expect: {
    timeout: 30_000,
  },
  globalSetup: './globalSetup',
  projects: [
    {
      testDir: './e2e',
      name: 'VSCode insiders',
      use: {
        vscodeVersion: 'insiders',
      },
    },
  ],
})
