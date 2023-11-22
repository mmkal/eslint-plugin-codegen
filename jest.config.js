/** @type {import('ts-jest/dist/types').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  prettierPath: require.resolve('prettier-2'),
  modulePathIgnorePatterns: ['<rootDir>/.vscode-test'],
  testPathIgnorePatterns: ['<rootDir>/e2e'],
}
