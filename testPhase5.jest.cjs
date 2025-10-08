module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.test.js' }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/tests/api/stock-movements.post.test.ts',
    '<rootDir>/tests/api/inventory.adjustments.post.test.ts'
  ],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
}
