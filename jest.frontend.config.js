module.exports = {
    testEnvironment: 'jsdom',  // Changed from 'node' to 'jsdom'
    setupFiles: ['./jest.setup.js'],
    testMatch: ['**/public/js/**/*.test.js'],
    moduleFileExtensions: ['js', 'json'],
    transform: {},
    verbose: true,
    // Additional configurations for frontend testing
    moduleNameMapper: {
        // Handle static file imports if needed
        '\\.(css|less|scss|sass)$': '<rootDir>/test/mocks/styleMock.js',
        '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/test/mocks/fileMock.js'
    },
    testEnvironmentOptions: {
        url: 'http://localhost'  // Set default URL for JSDOM
    }
};
