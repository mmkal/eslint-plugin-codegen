const mmkal = require('eslint-plugin-mmkal')

module.exports = [
  ...mmkal.recommendedFlatConfigs,
  ...mmkal.configs.globals_jest,
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
    files: ['e2e/**/*.ts'],
    rules: {'no-restricted-imports': 'off'},
  },
  {ignores: ['.vscode-test']},
]
