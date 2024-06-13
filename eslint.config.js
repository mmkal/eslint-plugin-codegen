require('tsx/cjs')
const mmkal = require('eslint-plugin-mmkal')
const codegen = require('./src/config')

module.exports = [
  ...mmkal.recommendedFlatConfigs.filter(cfg => !cfg.plugins?.codegen && !cfg.rules?.['codegen/codegen']),
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
  {ignores: ['.vscode-test']},
  codegen.pluginConfig,
  codegen.javascriptFilesConfig,
]
