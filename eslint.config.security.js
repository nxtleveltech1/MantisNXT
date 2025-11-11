// eslint.config.security.js - Security-focused ESLint configuration (CommonJS)
const js = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tseslintParser = require("@typescript-eslint/parser");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const jsxA11y = require("eslint-plugin-jsx-a11y");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      ".next/**", 
      "dist/**",
      "build/**",
      "coverage/**",
      "**/*.config.js",
      "**/*.config.ts",
      "scripts/**",
      "tools/**"
    ],
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        window: "readonly",
        document: "readonly",
        describe: "readonly",
        test: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly", 
        afterAll: "readonly",
        jest: "readonly",
      },
    },
    plugins: {
      "react": react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // Security-focused rules
      "no-eval": "error",
      "no-implied-eval": "error", 
      "no-new-func": "error",
      "no-script-url": "error",
      "no-alert": "warn",
      "no-console": "warn",
      "no-debugger": "error",
      "no-unused-expressions": "error",
      "no-unused-vars": "error",
      "no-undef": "error",
      "no-redeclare": "error",
      "no-unreachable": "error",
      
      // React security rules
      "react/no-danger": "warn",
      "react/no-danger-with-children": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-no-target-blank": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        window: "readonly",
        document: "readonly",
        URL: "readonly",
        TextDecoder: "readonly",
        File: "readonly",
        FormData: "readonly",
        describe: "readonly",
        test: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly", 
        afterAll: "readonly",
        jest: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "react": react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // Security-focused rules
      "no-eval": "error",
      "no-implied-eval": "error", 
      "no-new-func": "error",
      "no-script-url": "error",
      "no-alert": "warn",
      "no-console": "warn",
      "no-debugger": "error",
      "no-unused-expressions": "error",
      "no-unused-vars": "error",
      "no-undef": "error",
      "no-redeclare": "error",
      "no-unreachable": "error",
      
      // TypeScript security rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      
      // React security rules
      "react/no-danger": "warn",
      "react/no-danger-with-children": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-no-target-blank": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      
      // Prevent XSS and injection attacks
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/\\beval\\s*\\(/i]",
          message: "Use of eval() is not allowed - security risk"
        },
        {
          selector: "Literal[value=/\\bFunction\\s*\\(/i]", 
          message: "Use of Function constructor is not allowed - security risk"
        }
      ],
    },
  },
];