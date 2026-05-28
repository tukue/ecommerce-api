module.exports = {
  testEnvironment: 'node',
  verbose: true,
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  rootDir: '.',
  testPathIgnorePatterns: ['/node_modules/']
};
