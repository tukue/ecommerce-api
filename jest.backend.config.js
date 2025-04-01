module.exports = {
  testEnvironment: 'node',
  verbose: true,
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['dotenv/config'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  rootDir: '.',
  testPathIgnorePatterns: ['/node_modules/']
};
