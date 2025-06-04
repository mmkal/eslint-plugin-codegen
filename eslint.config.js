// @ts-expect-error for some reason privatenumber doesn't want this to be documented (/typed?) https://github.com/privatenumber/tsx/pull/496
require('tsx/cjs')
const mmkal = require('eslint-plugin-mmkal')
const localPlugin = require('./src')
const tsupConfig = require('./tsup.config')

module.exports = process.env.DOGFOOD_CODEGEN_PLUGIN // todo: make sure the "recommendedConfig" exported by this library actually works, shouldn't force ppl to use eslint-plugin-mmkal
  ? localPlugin.flatConfig.recommendedConfig
  : [
      ...mmkal.recommendedFlatConfigs.map(cfg => {
        if (cfg.plugins?.codegen) {
          return {
            ...cfg,
            plugins: {
              ...cfg.plugins,
              codegen: Object.fromEntries(
                Object.keys(cfg.plugins.codegen).map(key => {
                  return [key, localPlugin[key]]
                }),
              ),
            },
          }
        }

        return cfg
      }),
      // .map(cfg => {
      //   if (require('util').inspect(cfg).includes('codegen/')) {
      //     throw new Error(
      //       `codegen config found in eslint config coming from eslint-plugin-mmkal for this repo, this is going to cause confusion. Config: ${JSON.stringify(cfg)}`,
      //       {
      //         cause: cfg,
      //       },
      //     )
      //   }
      //   return cfg
      // }),
      {
        rules: {
          'no-restricted-imports': [
            'warn',
            {
              name: 'fs',
              message: 'Use the `fs` value passed to the codegen function instead of importing it directly.',
            },
            ...tsupConfig.esmLibs.map(lib => ({
              name: lib.name,
              message: `Import from the esm-modules.ts file instead (this library is ESM-only and will be bundled in the final package)`,
            })),
          ],
        },
      },
      {
        files: ['test/**/*.ts'],
        rules: {
          '@typescript-eslint/no-unsafe-argument': 'off', // mmkal
        },
      },
      {
        rules: {
          'unicorn/no-null': 'off', // mmkal
          'no-unsued-vars': 'off', // mmkal
        },
      },
      {
        files: ['e2e/**/*.ts'],
        rules: {'no-restricted-imports': 'off'},
      },
      {ignores: ['.vscode-test', 'test-results']},
      // codegen.pluginConfig,
      // codegen.javascriptFilesConfig,
    ]
