/**
 * Script to extract cookies from the Manus browser session
 * Run this after manually logging in to Option Samurai
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const COOKIES_FILE = path.join(process.cwd(), 'option-samurai-cookies.json');

async function extractCookies() {
  console.log('=== Option Samurai Cookie Extractor ===\n');
  console.log('Instructions:');
  console.log('1. Make sure you are logged in to Option Samurai in the Manus browser');
  console.log('2. Open the browser console (F12)');
  console.log('3. Run the following code in the console:\n');
  
  const extractScript = `
(async () => {
  const cookies = await cookieStore.getAll();
  const formatted = cookies
    .filter(c => c.domain.includes('optionsamurai'))
    .map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      expires: c.expires ? Math.floor(c.expires / 1000) : undefined,
      httpOnly: false,
      secure: c.secure || false,
      sameSite: c.sameSite || 'Lax'
    }));
  console.log(JSON.stringify(formatted, null, 2));
})();
  `.trim();
  
  console.log('```javascript');
  console.log(extractScript);
  console.log('```\n');
  console.log('4. Copy the output JSON');
  console.log('5. Save it to:', COOKIES_FILE);
  console.log('\nAlternatively, you can paste the JSON when prompted below.\n');
  
  // For now, just show instructions
  // In production, this could be automated with browser tools
}

extractCookies();

