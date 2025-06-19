import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: ['prettier', 'next/core-web-vitals', 'next/typescript'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prettier/prettier': [
        'error',
        { singleQuote: true, parser: 'typescript', endOfLine: 'auto' },
      ],
    },
  }),
  eslintPluginPrettier,
];

export default eslintConfig;
