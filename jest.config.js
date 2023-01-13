/** @type import('eslint').Linter.Config */
module.exports = {
    "roots": [
      "<rootDir>/src",
      "<rootDir>/test"
    ],
    transform: {
      "^.+\\.(ts|tsx)$": ['ts-jest', {tsconfig: "./tests/tsconfig.json"}]
    },
    testRegex: 'pool.test.ts',
    testTimeout: 600000
  }