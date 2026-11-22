// Usage: node screenshot.mjs <url> [label] [width]
// Saves full-page PNGs to ./temporary screenshots/screenshot-N[-label].png
import { createRequire } from 'node:module';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(join(root, '.tools', 'package.json'));
const puppeteer = require('puppeteer');

const [url = "http://localhost:3000", label, width = "1440", mode = "full"] = process.argv.slice(2);
const outDir = join(root, 'temporary screenshots');
await mkdir(outDir, { recursive: true });
const nums = (await readdir(outDir)).map(f => +(f.match(/^screenshot-(\d+)/)?.[1] ?? 0));
const n = Math.max(0, ...nums) + 1;
const file = join(outDir, `screenshot-${n}${label ? '-' + label : ''}.png`);

const { existsSync } = await import('node:fs');
const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const executablePath = candidates.find(p => p && existsSync(p));
const browser = await puppeteer.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage();
await page.setViewport({ width: +width, height: 900, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('Page error:', e.message));
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
// Reveal everything that animates in on scroll so full-page captures are complete.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
  window.scrollTo(0, 0);
});
await new Promise(r => setTimeout(r, +(process.env.SHOT_WAIT || 1200)));
await page.screenshot({ path: file, fullPage: mode !== "fold" });
await browser.close();
console.log(file);
