/**
 * Central ESLint configuration focused on strict typing with staged warnings.
 * Warnings stay visible, but only errors fail CI to keep momentum.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  plugins: [
    '@typescript-eslint',
    'unused-imports',
    'react',
    'react-hooks',
    'jsx-a11y',
    'ssot',
  ],
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  rules: {
    // keep strict, but do it in stages
    '@typescript-eslint/no-explicit-any': ['warn', { fixToUnknown: true, ignoreRestArgs: false }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'unused-imports/no-unused-imports': 'warn',
    '@typescript-eslint/no-require-imports': 'error',
    'no-unreachable': 'error',
    'no-useless-escape': 'error',
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    // existing project rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'ssot/no-legacy-supplier-inventory': 'error',
  },
  overrides: [
    {
      files: ['**/*.test.*', '**/test/**', '**/tests/**', '**/__mocks__/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
      },
    },
  ],
};

