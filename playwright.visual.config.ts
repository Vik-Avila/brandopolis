import { defineConfig } from '@playwright/test';
// Canonical visual evidence and responsive integrity against the real DEMO server (pnpm dev).
export default defineConfig({testDir:'./tests/visual',timeout:180000,workers:1,reporter:'list',use:{baseURL:'http://127.0.0.1:3000',channel:'chrome',trace:'off'},webServer:{command:'pnpm dev',url:'http://127.0.0.1:3000',reuseExistingServer:!process.env.CI,timeout:30000}});
