import { chromium } from 'playwright';
import fs from 'fs/promises';

const outDir = '/opt/data/marketing-os/docs/screenshots';
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1800 }, deviceScaleFactor: 1.5 });

await page.goto('https://arjun-marketing-os.srksourabh.workers.dev', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${outDir}/marketing-os-home.png`, fullPage: true });

await page.getByLabel('Product name').fill('Silk Saree');
await page.getByLabel('Description').fill('Premium silk saree brand for festive, wedding, and heritage fashion buyers seeking authentic craftsmanship, elegant drape, and timeless Indian styling.');
await page.getByRole('button', { name: 'Clear' }).click();
await page.getByLabel(/Social content/i).check();
await page.getByRole('button', { name: /Generate presentable outputs/i }).click();
await page.locator('#status.success').waitFor({ timeout: 45000 });
await page.locator('#results .result-card').first().waitFor({ timeout: 45000 });
await page.locator('section.panel:has(#results)').scrollIntoViewIfNeeded();
await page.screenshot({ path: `${outDir}/marketing-os-results.png`, fullPage: true });
await page.locator('#results .result-card').first().screenshot({ path: `${outDir}/marketing-os-result-card.png` });

await browser.close();
console.log(`${outDir}/marketing-os-home.png`);
console.log(`${outDir}/marketing-os-results.png`);
console.log(`${outDir}/marketing-os-result-card.png`);
