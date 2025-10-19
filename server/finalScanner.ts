/**
 * Final Scanner - Uses both cookies and localStorage
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Cookie } from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add stealth plugin
puppeteer.use(StealthPlugin());

interface ScanResult {
  ticker: string;
  company: string;
  price: number;
  ivRank: string;
  strike: string;
  strikeDistance: string;
  expDate: string;
  daysToExp: number;
  totalOptVol: number;
  probMaxProfit: string;
  maxProfit: string;
}

interface ScanReport {
  scanDate: string;
  strategy: string;
  results: ScanResult[];
  excelBuffer: Buffer;
}

export class FinalScanner {
  private tokenPath = path.join(__dirname, '../auth-token.json');
  private cookiesPath = path.join(__dirname, '../browser-cookies.txt');
  
  private parseCookieString(cookieString: string): Cookie[] {
    const cookies: Cookie[] = [];
    const pairs = cookieString.split(';').map(s => s.trim());
    
    for (const pair of pairs) {
      const [name, ...valueParts] = pair.split('=');
      const value = valueParts.join('=');
      
      if (name && value) {
        cookies.push({
          name: name.trim(),
          value: value.trim(),
          domain: '.optionsamurai.com',
          path: '/',
          expires: Math.floor(Date.now() / 1000) + (86400 * 30), // 30 days
          size: name.length + value.length,
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
          session: false
        });
      }
    }
    
    return cookies;
  }
  
  async executeScan(): Promise<ScanReport> {
    console.log('[FinalScanner] Starting scan with cookies + localStorage...');
    
    // Load saved token
    if (!fs.existsSync(this.tokenPath)) {
      throw new Error('Auth token not found. Please extract token from browser first.');
    }
    
    const tokenData = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
    
    if (!tokenData.accessToken) {
      throw new Error('Access token is missing from auth-token.json');
    }
    
    // Load cookies
    if (!fs.existsSync(this.cookiesPath)) {
      throw new Error('Browser cookies not found. Please extract cookies from browser first.');
    }
    
    const cookieString = fs.readFileSync(this.cookiesPath, 'utf-8').trim();
    const cookies = this.parseCookieString(cookieString);
    
    console.log('[FinalScanner] Loaded', cookies.length, 'cookies');
    console.log('[FinalScanner] Token loaded successfully');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });
    
    try {
      const page = await browser.newPage();
      
      // Set cookies first
      await page.setCookie(...cookies);
      console.log('[FinalScanner] Cookies set');
      
      // Set realistic viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });
      
      console.log('[FinalScanner] Navigating to main page...');
      
      // Navigate to main page first
      await page.goto('https://new.optionsamurai.com/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Set all localStorage items
      console.log('[FinalScanner] Setting localStorage data...');
      await page.evaluate((data) => {
        Object.keys(data).forEach(key => {
          localStorage.setItem(key, data[key]);
        });
      }, tokenData);
      
      await page.screenshot({ path: '/tmp/final-main-page.png' });
      console.log('[FinalScanner] Main page screenshot saved');
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('[FinalScanner] Navigating to scan page...');
      
      // Navigate directly to the scan URL
      await page.goto('https://new.optionsamurai.com/screener/scan/44060', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      await page.screenshot({ path: '/tmp/final-scan-page.png' });
      console.log('[FinalScanner] Scan page screenshot saved');
      
      // Wait for page to initialize
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if we're on the login page
      const isLoginPage = await page.evaluate(() => {
        return document.body.innerHTML.includes('auth0-lock') || 
               document.body.innerHTML.includes('Sign in') ||
               document.title.includes('Auth0');
      });
      
      if (isLoginPage) {
        await page.screenshot({ path: '/tmp/final-login-redirect.png' });
        throw new Error('Redirected to login page. Cookies or token may be invalid or expired.');
      }
      
      console.log('[FinalScanner] Successfully loaded scan page');
      
      // Check for RUN SCAN button
      const hasRunButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => btn.textContent?.toUpperCase().includes('RUN'));
      });
      
      if (hasRunButton) {
        console.log('[FinalScanner] Found RUN SCAN button, clicking...');
        
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const runButton = buttons.find(btn => btn.textContent?.toUpperCase().includes('RUN'));
          if (runButton) {
            (runButton as HTMLButtonElement).click();
          }
        });
        
        // Wait for scan to execute
        console.log('[FinalScanner] Waiting for scan results...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        await page.screenshot({ path: '/tmp/final-after-scan.png' });
        console.log('[FinalScanner] After scan screenshot saved');
      }
      
      // Extract results
      console.log('[FinalScanner] Extracting results...');
      
      const results = await page.evaluate(() => {
        const rows: any[] = [];
        const table = document.querySelector('table');
        
        if (!table) {
          return rows;
        }
        
        const tbody = table.querySelector('tbody');
        if (!tbody) {
          return rows;
        }
        
        const trs = tbody.querySelectorAll('tr');
        
        trs.forEach((tr) => {
          const cells = tr.querySelectorAll('td');
          if (cells.length >= 10) {
            rows.push({
              ticker: cells[0]?.textContent?.trim() || '',
              company: cells[1]?.textContent?.trim() || '',
              price: parseFloat(cells[2]?.textContent?.trim() || '0'),
              ivRank: cells[3]?.textContent?.trim() || '',
              strike: cells[4]?.textContent?.trim() || '',
              strikeDistance: cells[5]?.textContent?.trim() || '',
              expDate: cells[6]?.textContent?.trim() || '',
              daysToExp: parseInt(cells[7]?.textContent?.trim() || '0'),
              totalOptVol: parseInt(cells[8]?.textContent?.replace(/,/g, '') || '0'),
              probMaxProfit: cells[9]?.textContent?.trim() || '',
              maxProfit: cells[10]?.textContent?.trim() || ''
            });
          }
        });
        
        return rows;
      });
      
      console.log(`[FinalScanner] Extracted ${results.length} results`);
      
      if (results.length === 0) {
        // Save page HTML for debugging
        const html = await page.content();
        fs.writeFileSync('/tmp/final-page-content.html', html);
        console.log('[FinalScanner] Page HTML saved to /tmp/final-page-content.html');
      }
      
      // Generate Excel report
      const excelBuffer = await this.generateExcelReport(results);
      
      return {
        scanDate: new Date().toISOString(),
        strategy: 'Bull PUT Spread - Bi-Weekly Income',
        results,
        excelBuffer
      };
      
    } finally {
      await browser.close();
    }
  }
  
  private async generateExcelReport(results: ScanResult[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Scan Results');
    
    // Add headers
    worksheet.columns = [
      { header: 'Ticker', key: 'ticker', width: 12 },
      { header: 'Company', key: 'company', width: 30 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'IV Rank', key: 'ivRank', width: 12 },
      { header: 'Strike', key: 'strike', width: 15 },
      { header: 'Strike Distance', key: 'strikeDistance', width: 20 },
      { header: 'Exp. Date', key: 'expDate', width: 15 },
      { header: 'Days to Exp', key: 'daysToExp', width: 15 },
      { header: 'Total Opt. Vol.', key: 'totalOptVol', width: 18 },
      { header: 'Prob. Max Profit', key: 'probMaxProfit', width: 18 },
      { header: 'Max Profit', key: 'maxProfit', width: 15 }
    ];
    
    // Style headers
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    
    // Add data
    results.forEach(row => {
      worksheet.addRow(row);
    });
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

