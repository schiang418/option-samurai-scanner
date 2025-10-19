// This script should be run in the browser console when logged in to Option Samurai
// It will extract cookies in a format that can be used by Puppeteer

const cookies = await cookieStore.getAll();
console.log(JSON.stringify(cookies, null, 2));

