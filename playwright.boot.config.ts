import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/boot',timeout:30000,workers:1,reporter:'list',use:{baseURL:'http://127.0.0.1:3001',channel:'chrome',viewport:{width:390,height:844}}});
