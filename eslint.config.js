// eslint-disable-next-line import/no-extraneous-dependencies
const mmkal = require('eslint-plugin-mmkal')

/** @type {import('eslint').Linter.Config} */
// module.exports = {
//   ...recommended,
//   ignorePatterns: [...recommended.ignorePatterns, 'test-results/**'],
//   overrides: [
//     ...recommended.overrides,
//     {
//       files: ['*.md'],
//       rules: {
//         'mmkal/unicorn/filename-case': 'off',
//         'mmkal/prettier/prettier': 'off',
//         'no-trailing-spaces': 'off',
//       },
//     },
//   ],
//   rules: {
//     'mmkal/@typescript-eslint/no-explicit-any': 'off',
//     'mmkal/@typescript-eslint/no-unsafe-assignment': 'off',
//     'mmkal/@typescript-eslint/no-unsafe-return': 'off',
//     'mmkal/@rushstack/hoist-jest-mock': 'off',
//     'mmkal/@typescript-eslint/consistent-type-imports': 'off',
//     'mmkal/unicorn/expiring-todo-comments': 'off',
//     // todo: enable
//     'mmkal/unicorn/prefer-string-replace-all': 'off',
//     'mmkal/@typescript-eslint/no-unsafe-argument': 'off',
//     'mmkal/unicorn/prefer-at': 'off',
//   },
// }

module.exports = [
  ...mmkal.recommendedFlatConfigs, //
]
