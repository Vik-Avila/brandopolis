import { defineConfig } from '@playwright/test';
// ADR-0026/0027 · manual in-app live AI smoke against a local DEMO started with `--live-ai`. Never part of CI suites.
const baseURL=process.env.BRANDOPOLIS_BASE_URL??'http://127.0.0.1:3001';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(baseURL))throw new Error('Live AI smoke only runs against a local DEMO.');
export default defineConfig({testDir:'./tests/live-ai',timeout:300000,workers:1,reporter:'list',use:{baseURL,channel:'chrome',viewport:{width:1440,height:900},trace:'off'}});
