import tseslint from 'typescript-eslint';
export default tseslint.config({ignores:['node_modules/**','.venv/**','.local/**','drizzle/**','.claude/worktrees/**']}, ...tseslint.configs.recommended, {rules:{'@typescript-eslint/no-unused-vars':['error',{varsIgnorePattern:'^_',argsIgnorePattern:'^_'}]}});
