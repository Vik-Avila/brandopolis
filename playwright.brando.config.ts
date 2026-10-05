import { defineConfig } from '@playwright/test';
// Isolated frontend/HTTP contract fixture; complements, never replaces the database-backed suites.
export default defineConfig({testDir:'./tests/brando-browser',workers:1,timeout:30000,reporter:'list',use:{channel:'chrome',launchOptions:process.env.BRANDOPOLIS_CHROME_PATH?{executablePath:process.env.BRANDOPOLIS_CHROME_PATH}:{},trace:'off'},projects:[{name:'desktop',use:{viewport:{width:1440,height:900}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]});
