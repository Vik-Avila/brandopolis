import { defineConfig } from '@playwright/test';
// Target another local DEMO instance (for example pnpm competition:start --isolated on 3001) with BRANDOPOLIS_BASE_URL and BRANDOPOLIS_SESSION_FILE.
const baseURL=process.env.BRANDOPOLIS_BASE_URL??'http://127.0.0.1:3000';
export default defineConfig({testDir:'./tests/visual',testMatch:'phase10a.spec.ts',timeout:180000,workers:1,reporter:'list',use:{baseURL,channel:'chrome',trace:'off',actionTimeout:10000}});

