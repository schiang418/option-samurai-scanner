/**
 * Token-based Option Samurai Scanner
 * Uses saved Auth0 access token to bypass login
 */

import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ScanResult {
  ticker: string;
  company: string;
  price: number;
  ivRank: string;
  ivPercentile: number;
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

export class TokenBasedScanner {
  private tokenPath = path.join(__dirname, '../auth-token.json');
  
  async executeScan(): Promise<ScanReport> {
    console.log('[TokenScanner] Starting scan with saved token...');
    
    // Load saved token
    if (!fs.existsSync(this.tokenPath)) {
      throw new Error('Auth token not found. Please extract token from browser first.');
    }
    
    const tokenData = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
    
    if (!tokenData.accessToken) {
      throw new Error('Access token is missing from auth-token.json');
    }
    
    console.log('[TokenScanner] Token loaded successfully');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    try {
      const page = await browser.newPage();
      
      console.log('[TokenScanner] Navigating to main page first...');
      // First navigate to the main page to set localStorage
      await page.goto('https://new.optionsamurai.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Set all localStorage items
      await page.evaluate((data) => {
        Object.keys(data).forEach(key => {
          localStorage.setItem(key, data[key]);
        });
      }, tokenData);
      
      console.log('[TokenScanner] Token set in localStorage, navigating to scan page...');
      
      // Now navigate to the scan page
      await page.goto('https://new.optionsamurai.com/screener/scan/44060', {
        waitUntil: 'networkidle0',
        timeout: 60000
      });
      
      // Wait for page to fully initialize
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Take screenshot to see what we got
      await page.screenshot({ path: '/tmp/after-navigation.png' });
      console.log('[TokenScanner] Screenshot saved: /tmp/after-navigation.png');
      
      // Check if we're logged in
      const isLoggedIn = await page.evaluate(() => {
        return !!localStorage.getItem('accessToken');
      });
      console.log('[TokenScanner] Logged in status:', isLoggedIn);
      
      console.log('[TokenScanner] Clicking RUN SCAN button...');
      
      // Try to find and click the RUN SCAN button
      try {
        await page.waitForSelector('button:has-text("RUN SCAN")', { timeout: 10000 });
        await page.click('button:has-text("RUN SCAN")');
      } catch (e) {
        // Button might not be visible, try alternative selectors
        const buttons = await page.$$('button');
        for (const button of buttons) {
          const text = await page.evaluate(el => el.textContent, button);
          if (text?.includes('RUN') || text?.includes('SCAN')) {
            await button.click();
            break;
          }
        }
      }
      
      console.log('[TokenScanner] Waiting for results...');
      
      // Take screenshot after clicking
      await new Promise(resolve => setTimeout(resolve, 3000));
      await page.screenshot({ path: '/tmp/after-click.png' });
      console.log('[TokenScanner] Screenshot after click saved');
      
      // Wait for results table or no results message
      try {
        await Promise.race([
          page.waitForSelector('table', { timeout: 45000 }),
          page.waitForSelector('text="no options"', { timeout: 45000 })
        ]);
      } catch (e) {
        // Take final screenshot on error
        await page.screenshot({ path: '/tmp/timeout-error.png' });
        console.log('[TokenScanner] Timeout screenshot saved: /tmp/timeout-error.png');
        throw e;
      }
      
      // Additional wait for data to fully load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('[TokenScanner] Extracting results...');
      
      // Extract scan results
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
        
        trs.forEach(tr => {
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
      
      console.log(`[TokenScanner] Extracted ${results.length} results`);
      
      if (results.length === 0) {
        // Take a screenshot for debugging
        await page.screenshot({ path: '/tmp/no-results.png' });
        console.log('[TokenScanner] No results found. Screenshot saved to /tmp/no-results.png');
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

