// eslint.config.js - ESLint v9 flat config (CommonJS)
const path = require("node:path");
const js = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tseslintParser = require("@typescript-eslint/parser");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const jsxA11y = require("eslint-plugin-jsx-a11y");
const unusedImports = require("eslint-plugin-unused-imports");

// Import custom SSOT plugin
const ssotPlugin = {
  rules: {
    'no-legacy-supplier-inventory': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Forbid direct access to legacy suppliers/inventory tables. Use SSOT services or public views.',
          recommended: true,
        },
        schema: [],
      },
      create(context) {
        const banned = [
          /\bFROM\s+suppliers\b/i,
          /\bJOIN\s+suppliers\b/i,
          /\bINSERT\s+INTO\s+suppliers\b/i,
          /\bUPDATE\s+suppliers\b/i,
          /\bDELETE\s+FROM\s+suppliers\b/i,
          /\bINSERT\s+INTO\s+inventory_items\b/i,
          /\bUPDATE\s+inventory_items\b/i,
          /\bDELETE\s+FROM\s+inventory_items\b/i,
        ];
        
        function checkString(value, node) {
          if (typeof value !== 'string') return;
          // Allow schema-qualified replacements
          if (/public\.suppliers/i.test(value) || /public\.inventory_items/i.test(value)) return;
          for (const re of banned) {
            if (re.test(value)) {
              context.report({
                node,
                message: 'SSOT violation: use canonical SSOT services or schema-qualified public views (public.suppliers/public.inventory_items).'
              });
              break;
            }
          }
        }
        
        return {
          Literal(node) {
            checkString(node.value, node);
          },
          TemplateLiteral(node) {
            const raw = node.quasis.map(q => q.value.raw).join('');
            checkString(raw, node);
          },
        };
      }
    }
  }
};

module.exports = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.config.js",
      "*.config.ts",
      "scripts/**",
      "tools/**",
      ".archive/**",
      "**/archive/**",
      "**/.archive/**",
      "src/components/ui/BulletproofDataLoader.tsx",
      "src/components/ui/BulletproofActivityList.tsx",
      "src/components/examples/BulletproofDashboardExample.tsx"
    ],
  },
  {
    rules: {
      "no-useless-escape": "error",
      "no-unreachable": "error",
      "unused-imports/no-unused-imports": "warn",
      "no-undef": "off",
      "no-case-declarations": "warn",
      "no-empty": "warn",
      "react/no-unknown-property": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-redundant-roles": "warn",
    },
    plugins: {
      "unused-imports": unusedImports,
    },
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
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        history: "readonly",
        URL: "readonly",
        TextDecoder: "readonly",
        TextEncoder: "readonly",
        File: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        Headers: "readonly",
        Response: "readonly",
        Request: "readonly",
        RequestInit: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        DOMParser: "readonly",
        Document: "readonly",
        Element: "readonly",
        NodeJS: "readonly",
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
      "unused-imports": unusedImports,
      "ssot": ssotPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/heading-has-content": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "react/no-unescaped-entities": "warn",
      "react/jsx-no-undef": "warn",
      "prefer-const": "warn",
      "unused-imports/no-unused-imports": "warn",
      "ssot/no-legacy-supplier-inventory": "error",
      "no-undef": "off",
      "no-case-declarations": "warn",
      "no-empty": "warn",
      "react/no-unknown-property": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-redundant-roles": "warn",
      "no-redeclare": "warn",
      "no-import-assign": "warn",
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
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        history: "readonly",
        URL: "readonly",
        TextDecoder: "readonly",
        TextEncoder: "readonly",
        File: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        Headers: "readonly",
        Response: "readonly",
        Request: "readonly",
        RequestInit: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        DOMParser: "readonly",
        Document: "readonly",
        Element: "readonly",
        NodeJS: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        React: "readonly",
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
      "unused-imports": unusedImports,
      "ssot": ssotPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": [
        "warn",
        {
          fixToUnknown: true,
          ignoreRestArgs: false,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": "allow-with-description",
          "ts-nocheck": true,
        },
      ],
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/heading-has-content": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "react/no-unescaped-entities": "warn",
      "react/jsx-no-undef": "warn",
      "prefer-const": "warn",
      "unused-imports/no-unused-imports": "warn",
      "ssot/no-legacy-supplier-inventory": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/\\bFROM\\s+suppliers\\b/i]",
          message: "Use public.suppliers view or SSOT services"
        },
        {
          selector: "Literal[value=/\\bJOIN\\s+suppliers\\b/i]",
          message: "Use public.suppliers view or SSOT services"
        },
        {
          selector: "Literal[value=/\\bINSERT\\s+INTO\\s+inventory_items\\b/i]",
          message: "Write via SSOT inventoryService to core.stock_on_hand"
        },
        {
          selector: "Literal[value=/\\bUPDATE\\s+inventory_items\\b/i]",
          message: "Write via SSOT inventoryService to core.stock_on_hand"
        },
        {
          selector: "Literal[value=/\\bDELETE\\s+FROM\\s+inventory_items\\b/i]",
          message: "Write via SSOT inventoryService to core.stock_on_hand"
        }
      ],
      "no-undef": "off",
      "no-case-declarations": "warn",
      "no-empty": "warn",
      "react/no-unknown-property": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-redundant-roles": "warn",
      "no-useless-escape": "error",
      "no-redeclare": "warn",
      "no-import-assign": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-this-alias": "warn",
      "require-yield": "warn",
      "no-const-assign": "warn",
      "no-prototype-builtins": "warn",
      "no-control-regex": "warn",
    },
  },
  {
    files: ["src/components/**/*", "src/lib/**/*", "src/hooks/**/*"],
    rules: {
      "@typescript-eslint/ban-ts-comment": [
        "warn",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": "allow-with-description",
          "ts-nocheck": false,
        },
      ],
    },
  },
  {
    files: ["**/route.deprecated.ts"],
    rules: {
      "ssot/no-legacy-supplier-inventory": "off",
    },
  },
  {
    files: ["**/*.test.*", "**/test/**", "**/tests/**", "**/__mocks__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
];
