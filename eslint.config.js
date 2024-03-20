const mmkal = require('eslint-plugin-mmkal')

module.exports = [
  ...mmkal.recommendedFlatConfigs,
  ...mmkal.configs.globals_jest,
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off', // mmkal
    },
  },
  {ignores: ['.vscode-test']},
]
