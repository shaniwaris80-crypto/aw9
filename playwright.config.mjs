import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'browser.*.spec.mjs',timeout:45000,retries:1,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:390,height:844}},webServer:{command:'python3 -m http.server 4173 --bind 127.0.0.1',url:'http://127.0.0.1:4173',reuseExistingServer:true,timeout:15000},reporter:'line'});
