/**
 * Manual login script to save browser state
 * Run this once to login and save cookies/session
 */

import { chromium } from 'playwright';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BROWSER_STATE_PATH = path.join(__dirname, '.browser-state');

async function saveLoginState() {
  console.log('Opening browser for manual login...');
  console.log('Please login to Option Samurai in the browser window that opens.');
  console.log('Once logged in and you can see the screener page, press Ctrl+C to save the state.');
  
  const browser = await chromium.launch({
    headless: false, // Open visible browser
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to login page
  await page.goto('https://new.optionsamurai.com');
  
  // Wait for user to manually login
  console.log('\nWaiting for you to login...');
  console.log('After logging in successfully, the browser state will be saved automatically in 60 seconds.');
  console.log('Or press Ctrl+C to save immediately.\n');
  
  // Set up Ctrl+C handler
  let saved = false;
  process.on('SIGINT', async () => {
    if (!saved) {
      console.log('\n\nSaving browser state...');
      await context.storageState({ path: BROWSER_STATE_PATH });
      console.log(`✅ Browser state saved to: ${BROWSER_STATE_PATH}`);
      console.log('You can now use the scanner without manual login!');
      saved = true;
      await browser.close();
      process.exit(0);
    }
  });
  
  // Auto-save after 60 seconds
  setTimeout(async () => {
    if (!saved) {
      console.log('\n\nAuto-saving browser state...');
      await context.storageState({ path: BROWSER_STATE_PATH });
      console.log(`✅ Browser state saved to: ${BROWSER_STATE_PATH}`);
      console.log('You can now use the scanner without manual login!');
      saved = true;
      await browser.close();
      process.exit(0);
    }
  }, 60000);
}

saveLoginState().catch(console.error);

