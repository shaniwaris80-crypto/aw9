import {test,expect} from '@playwright/test';

test('arranca sin errores de sintaxis y muestra login',async({page})=>{const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.locator('#loginForm')).toBeVisible();await expect(page.locator('h1')).toContainText('ARW2026');await page.waitForTimeout(1500);expect(errors.filter(e=>/SyntaxError|Unexpected token|Cannot find module/i.test(e))).toEqual([])});

test('PWA y service worker están configurados',async({page})=>{await page.goto('/');const manifest=await page.locator('link[rel="manifest"]').getAttribute('href');expect(manifest).toBeTruthy();const sw=await page.evaluate(async()=>{if(!('serviceWorker'in navigator))return false;const r=await navigator.serviceWorker.ready;return Boolean(r)});expect(sw).toBe(true)});

test('interfaz móvil no provoca overflow global destructivo',async({page})=>{await page.goto('/');const data=await page.evaluate(()=>({w:document.documentElement.scrollWidth,v:document.documentElement.clientWidth}));expect(data.w).toBeLessThanOrEqual(data.v+4)});
