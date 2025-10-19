import { chromium } from 'playwright';

async function debugScanner() {
  console.log('Starting debug scanner...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const email = process.env.OPTION_SAMURAI_EMAIL;
  const password = process.env.OPTION_SAMURAI_PASSWORD;

  console.log('Logging in...');
  await page.goto('https://auth.optionsamurai.com/login');
  await page.fill('input[type="email"]', email!);
  await page.fill('input[type="password"]', password!);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/screener**', { timeout: 30000 });
  
  console.log('Login successful! Navigating to scan...');
  await page.goto('https://new.optionsamurai.com/screener/scan/44060', { waitUntil: 'networkidle' });
  
  // Take screenshot
  await page.screenshot({ path: '/home/ubuntu/scan-page.png', fullPage: true });
  console.log('Screenshot saved to /home/ubuntu/scan-page.png');
  
  // Get page content
  const content = await page.content();
  const fs = await import('fs/promises');
  await fs.writeFile('/home/ubuntu/scan-page.html', content);
  console.log('HTML saved to /home/ubuntu/scan-page.html');
  
  // Check for results
  const hasTable = await page.locator('table tbody tr').count();
  console.log(`Table rows found: ${hasTable}`);
  
  // List all buttons
  const buttons = await page.locator('button').all();
  console.log(`Total buttons found: ${buttons.length}`);
  
  for (let i = 0; i < Math.min(buttons.length, 20); i++) {
    const text = await buttons[i].textContent();
    console.log(`Button ${i}: "${text}"`);
  }
  
  console.log('\nKeeping browser open for 60 seconds...');
  await page.waitForTimeout(60000);
  
  await browser.close();
}

debugScanner().catch(console.error);

