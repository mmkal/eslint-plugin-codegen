require('tsx/cjs')
const mmkal = require('eslint-plugin-mmkal')
const codegen = require('./src/config')

module.exports = [
  ...mmkal.recommendedFlatConfigs
    .map(cfg => {
      const harmlessRules = {'no-unused-vars': 'off'} // make sure it's non-empty so eslint doesn't complain
      if (cfg.plugins?.codegen) {
        const plugins = {...cfg.plugins}
        delete plugins.codegen
        cfg = {
          ...cfg,
          plugins,
          rules: {...harmlessRules, ...cfg.rules},
        }
      }
      if (`${cfg.processor}`.startsWith('codegen/')) {
        const copied = {...cfg}
        delete copied.processor
        cfg = {
          ...copied,
          rules: {...harmlessRules, ...copied.rules},
        }
      }
      if (cfg.rules?.['codegen/codegen']) {
        const rules = {...cfg.rules}
        delete rules['codegen/codegen']
        cfg = {
          ...cfg,
          rules: {...rules, ...harmlessRules},
        }
      }

      // doesn't seem to be codegen related, leave it alone
      return cfg
    })
    .map(cfg => {
      if (require('util').inspect(cfg).includes('codegen/')) {
        throw new Error(
          `codegen config found in eslint config coming from eslint-plugin-mmkal for this repo, this is going to cause confusion. Config: ${JSON.stringify(cfg)}`,
          {
            cause: cfg,
          },
        )
      }
      return cfg
    }),
  {
    rules: {
      'no-restricted-imports': [
        'warn',
        {name: 'fs', message: 'Use the `fs` value passed to the codegen function instead of importing it directly.'},
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
  codegen.pluginConfig,
  codegen.javascriptFilesConfig,
]
