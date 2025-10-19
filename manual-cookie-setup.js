/**
 * Manual Cookie Setup Script
 * 
 * Run this script and paste the cookies from your browser's developer tools
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=== Option Samurai Cookie Setup ===\n');
console.log('Please follow these steps:');
console.log('1. Open Option Samurai in your browser and login');
console.log('2. Press F12 to open Developer Tools');
console.log('3. Go to Application tab → Cookies → https://new.optionsamurai.com');
console.log('4. Copy all cookie names and values\n');
console.log('Enter cookies in format: name1=value1; name2=value2; ...\n');

rl.question('Paste cookies here: ', (cookieString) => {
  try {
    const cookies = cookieString.split(';').map(c => {
      const [name, ...valueParts] = c.trim().split('=');
      return {
        name: name.trim(),
        value: valueParts.join('=').trim(),
        domain: '.optionsamurai.com',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + (86400 * 30),
        httpOnly: false,
        secure: true,
        sameSite: 'Lax'
      };
    }).filter(c => c.name && c.value);

    const outputPath = path.join(__dirname, 'option-samurai-cookies.json');
    fs.writeFileSync(outputPath, JSON.stringify(cookies, null, 2));
    
    console.log(`\n✅ Success! Saved ${cookies.length} cookies to:`);
    console.log(outputPath);
    console.log('\nYou can now run the scanner!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  
  rl.close();
});
