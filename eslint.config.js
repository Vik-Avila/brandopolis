import tseslint from 'typescript-eslint';
export default tseslint.config({ignores:['node_modules/**','.venv/**','.local/**','drizzle/**']}, ...tseslint.configs.recommended, {rules:{'@typescript-eslint/no-unused-vars':['error',{varsIgnorePattern:'^_',argsIgnorePattern:'^_'}]}});
