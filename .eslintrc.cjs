// eslint-disable-next-line mmkal/import/no-extraneous-dependencies
const recommended = require('eslint-plugin-mmkal').getRecommended()

module.exports = {
  ...recommended,
  overrides: [
    ...recommended.overrides,
    {
      files: ['*.md'],
      rules: {
        'mmkal/unicorn/filename-case': 'off',
        'mmkal/prettier/prettier': 'off',
      },
    },
  ],
  rules: {
    'mmkal/@typescript-eslint/no-explicit-any': 'off',
    'mmkal/@typescript-eslint/no-unsafe-assignment': 'off',
    'mmkal/@typescript-eslint/no-unsafe-return': 'off',
    'mmkal/@rushstack/hoist-jest-mock': 'off',
  },
}

// console.dir(module.exports, {depth: 100})
