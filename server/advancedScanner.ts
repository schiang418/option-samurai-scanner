/**
 * Advanced Token-based Scanner with Anti-Detection
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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

export class AdvancedScanner {
  private tokenPath = path.join(__dirname, '../auth-token.json');
  
  async executeScan(): Promise<ScanReport> {
    console.log('[AdvancedScanner] Starting scan with enhanced anti-detection...');
    
    // Load saved token
    if (!fs.existsSync(this.tokenPath)) {
      throw new Error('Auth token not found. Please extract token from browser first.');
    }
    
    const tokenData = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
    
    if (!tokenData.accessToken) {
      throw new Error('Access token is missing from auth-token.json');
    }
    
    console.log('[AdvancedScanner] Token loaded successfully');
    
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
      
      // Set realistic viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });
      
      console.log('[AdvancedScanner] Navigating to main page...');
      
      // Navigate to main page first
      await page.goto('https://new.optionsamurai.com/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Set all localStorage items
      console.log('[AdvancedScanner] Setting localStorage data...');
      await page.evaluate((data) => {
        Object.keys(data).forEach(key => {
          localStorage.setItem(key, data[key]);
        });
      }, tokenData);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('[AdvancedScanner] Navigating to screener page...');
      
      // Navigate to screener main page first (not directly to scan)
      await page.goto('https://new.optionsamurai.com/screener', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      await page.screenshot({ path: '/tmp/screener-page.png' });
      console.log('[AdvancedScanner] Screener page screenshot saved');
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try to click on the saved scan
      console.log('[AdvancedScanner] Looking for bi-weekly income all scan...');
      
      try {
        // Wait for saved scans to appear
        await page.waitForSelector('text="bi-weekly income all"', { timeout: 10000 });
        
        // Click on it
        await page.click('text="bi-weekly income all"');
        console.log('[AdvancedScanner] Clicked on saved scan');
        
        // Wait for navigation
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        
      } catch (e) {
        console.log('[AdvancedScanner] Could not find saved scan, navigating directly...');
        
        // Navigate directly to the scan URL
        await page.goto('https://new.optionsamurai.com/screener/scan/44060', {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
      }
      
      await page.screenshot({ path: '/tmp/scan-page-loaded.png' });
      console.log('[AdvancedScanner] Scan page screenshot saved');
      
      // Wait for page to initialize
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if we need to click RUN SCAN
      console.log('[AdvancedScanner] Checking for RUN SCAN button...');
      
      const hasRunButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => btn.textContent?.includes('RUN'));
      });
      
      if (hasRunButton) {
        console.log('[AdvancedScanner] Found RUN SCAN button, clicking...');
        
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const runButton = buttons.find(btn => btn.textContent?.includes('RUN'));
          if (runButton) {
            (runButton as HTMLButtonElement).click();
          }
        });
        
        // Wait for scan to execute
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        await page.screenshot({ path: '/tmp/after-run-scan.png' });
        console.log('[AdvancedScanner] After RUN SCAN screenshot saved');
      }
      
      // Extract results
      console.log('[AdvancedScanner] Extracting results...');
      
      const results = await page.evaluate(() => {
        const rows: any[] = [];
        const table = document.querySelector('table');
        
        if (!table) {
          console.log('No table found');
          return rows;
        }
        
        const tbody = table.querySelector('tbody');
        if (!tbody) {
          console.log('No tbody found');
          return rows;
        }
        
        const trs = tbody.querySelectorAll('tr');
        console.log(`Found ${trs.length} rows`);
        
        trs.forEach((tr, index) => {
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
      
      console.log(`[AdvancedScanner] Extracted ${results.length} results`);
      
      if (results.length === 0) {
        // Save page HTML for debugging
        const html = await page.content();
        fs.writeFileSync('/tmp/page-content.html', html);
        console.log('[AdvancedScanner] Page HTML saved to /tmp/page-content.html');
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

