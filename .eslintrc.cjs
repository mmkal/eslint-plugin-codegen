// eslint-disable-next-line mmkal/import/no-extraneous-dependencies
const recommended = require('eslint-plugin-mmkal').getRecommended()

module.exports = {
  ...recommended,
  overrides: [
    ...recommended.overrides,
    {
      files: ['*.mad'],
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
    'mmkal/@typescript-eslint/consistent-type-imports': 'off',
    'mmkal/unicorn/expiring-todo-comments': 'off',
    // todo: enable
    'mmkal/unicorn/prefer-string-replace-all': 'off',
    'mmkal/@typescript-eslint/no-unsafe-argument': 'off',
    'mmkal/unicorn/prefer-at': 'off',
  },
}
