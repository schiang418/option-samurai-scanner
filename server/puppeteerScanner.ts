/**
 * Option Samurai Scanner using Puppeteer
 * More reliable for complex SPA applications
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());
import ExcelJS from 'exceljs';

export interface ScanResult {
  rank: number;
  ticker: string;
  companyName: string;
  stockPrice: number;
  priceChange: number;
  ivRank: number | null;
  ivValue: number;
  sellStrike: number;
  buyStrike: number;
  sellDistance: number;
  buyDistance: number;
  expirationDate: string;
  daysToExpiration: number;
  totalVolume: number;
  profitProbability: number;
  premium: number;
  maxProfit: number;
  returnRate: number;
}

export interface ScanReport {
  scanDate: string;
  strategy: string;
  results: ScanResult[];
  excelBuffer: Buffer;
}

export class PuppeteerScanner {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Initialize browser and login
   */
  async initialize(): Promise<void> {
    console.log('[Scanner] Launching Puppeteer browser...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent to avoid detection
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    // Login
    await this.login();
  }

  /**
   * Login to Option Samurai
   */
  async login(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const email = process.env.OPTION_SAMURAI_EMAIL;
    const password = process.env.OPTION_SAMURAI_PASSWORD;

    if (!email || !password) {
      throw new Error('OPTION_SAMURAI_EMAIL and OPTION_SAMURAI_PASSWORD environment variables must be set');
    }

    console.log('[Scanner] Navigating to login page...');
    await this.page.goto('https://auth.optionsamurai.com/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('[Scanner] Filling login form...');
    await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Click on email field first (more human-like)
    await this.page.click('input[type="email"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Type email with random delays
    await this.page.type('input[type="email"]', email, { delay: 100 + Math.random() * 50 });
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Click on password field
    await this.page.click('input[type="password"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Type password with random delays
    await this.page.type('input[type="password"]', password, { delay: 100 + Math.random() * 50 });
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('[Scanner] Submitting login...');
    await this.page.click('button[type="submit"]');
    
    // Wait for navigation with longer timeout
    try {
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 });
    } catch (error) {
      // Check current URL even if navigation timeout
      const currentUrl = this.page.url();
      console.log('[Scanner] Current URL after login attempt:', currentUrl);
      
      // Save screenshot for debugging
      await this.page.screenshot({ path: '/tmp/puppeteer-login-error.png' });
      
      if (!currentUrl.includes('screener') && !currentUrl.includes('optionsamurai.com')) {
        throw new Error(`Login failed - stuck on: ${currentUrl}`);
      }
      
      // If we're on Option Samurai domain, continue
      console.log('[Scanner] Navigation timeout but on correct domain, continuing...');
    }

    // Verify we're logged in
    const currentUrl = this.page.url();
    console.log('[Scanner] Final URL:', currentUrl);
    
    if (currentUrl.includes('auth.optionsamurai.com')) {
      throw new Error('Login failed - still on auth page');
    }
    
    console.log('[Scanner] Login successful!');
  }

  /**
   * Execute bi-weekly income scan
   */
  async scanBiWeeklyIncome(): Promise<ScanResult[]> {
    if (!this.page) {
      throw new Error('Scanner not initialized. Call initialize() first.');
    }

    console.log('[Scanner] Navigating to bi-weekly income scan...');
    
    // Navigate directly to the scan URL
    await this.page.goto('https://new.optionsamurai.com/screener/scan/44060', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });
    
    console.log('[Scanner] Page loaded, waiting for content...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to click RUN SCAN button if it exists
    try {
      const runScanButton = await this.page.$('button:has-text("RUN SCAN")');
      if (runScanButton) {
        console.log('[Scanner] Found RUN SCAN button, clicking...');
        await runScanButton.click();
        console.log('[Scanner] Waiting for scan to complete...');
        // Wait for network to be idle after clicking
        await this.page.waitForNetworkIdle({ timeout: 40000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log('[Scanner] No RUN SCAN button, waiting for auto-load...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.log('[Scanner] Error clicking RUN SCAN, continuing...', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Check for "no results" message
    const noResultsText = await this.page.evaluate(() => {
      return document.body.textContent?.includes('There are no options in the market that fit the scan criteria');
    });
    
    if (noResultsText) {
      console.log('[Scanner] No results found for current market conditions');
      return [];
    }
    
    // Wait for table to appear
    console.log('[Scanner] Waiting for results table...');
    try {
      await this.page.waitForSelector('table tbody tr', { timeout: 30000 });
    } catch (error) {
      console.log('[Scanner] No results table found');
      // Save screenshot for debugging
      await this.page.screenshot({ path: '/tmp/puppeteer-scan-error.png' });
      return [];
    }
    
    console.log('[Scanner] Extracting scan results...');
    
    // Extract results using page.evaluate
    const results = await this.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      
      const parseNum = (text: string): number => {
        const cleaned = text.replace(/[$,%,]/g, '').trim();
        return parseFloat(cleaned) || 0;
      };
      
      const getText = (element: Element | null | undefined): string => {
        return element?.textContent?.trim() || '';
      };
      
      return rows.map((row, index) => {
        const cells = Array.from(row.querySelectorAll('td'));
        
        // Ticker and company
        const tickerCell = cells[0];
        const ticker = getText(tickerCell?.querySelector('div > div:first-child'));
        const companyName = getText(tickerCell?.querySelector('div > div:nth-child(2)'));
        
        // Price and change
        const priceCell = cells[1];
        const priceText = getText(priceCell?.querySelector('div > div:first-child'));
        const changeText = getText(priceCell?.querySelector('div > div:nth-child(2)'));
        
        // IV Rank
        const ivCell = cells[2];
        const ivRankText = getText(ivCell?.querySelector('div > div:first-child'));
        const ivValueText = getText(ivCell?.querySelector('div > div:nth-child(2)'));
        
        // Strikes
        const strikeCell = cells[3];
        const strikeText = getText(strikeCell);
        const strikeMatch = strikeText.match(/([\d.]+)\/([\d.]+)/);
        const sellStrike = strikeMatch ? parseFloat(strikeMatch[1]) : 0;
        const buyStrike = strikeMatch ? parseFloat(strikeMatch[2]) : 0;
        
        // Distances
        const distanceMatch = strikeText.match(/(-?[\d.]+)%\/(-?[\d.]+)%/);
        const sellDistance = distanceMatch ? parseFloat(distanceMatch[1]) : 0;
        const buyDistance = distanceMatch ? parseFloat(distanceMatch[2]) : 0;
        
        // Expiration
        const expCell = cells[4];
        const expDate = getText(expCell?.querySelector('div > div:first-child'));
        const daysText = getText(expCell?.querySelector('div > div:nth-child(2)'));
        const daysMatch = daysText.match(/\d+/);
        const daysToExpiration = daysMatch ? parseInt(daysMatch[0]) : 0;
        
        // Volume, probability, profit
        const volumeText = getText(cells[5]);
        const probText = getText(cells[6]);
        const profitText = getText(cells[7]);
        
        return {
          rank: index + 1,
          ticker,
          companyName,
          stockPrice: parseNum(priceText),
          priceChange: parseNum(changeText),
          ivRank: ivRankText && ivRankText !== 'N/A' ? parseNum(ivRankText) : null,
          ivValue: parseNum(ivValueText),
          sellStrike,
          buyStrike,
          sellDistance,
          buyDistance,
          expirationDate: expDate,
          daysToExpiration,
          totalVolume: parseNum(volumeText.replace(/,/g, '')),
          profitProbability: parseNum(probText),
          premium: 0,
          maxProfit: parseNum(profitText),
          returnRate: 0
        };
      });
    });

    // Calculate premium and return rate
    results.forEach(result => {
      const spreadWidth = (result.buyStrike - result.sellStrike) * 100;
      result.premium = result.maxProfit > 0 ? spreadWidth - result.maxProfit : 0;
      result.returnRate = result.premium > 0 ? (result.maxProfit / result.premium) * 100 : 0;
    });

    console.log(`[Scanner] Extracted ${results.length} results`);
    
    return results;
  }

  /**
   * Generate Excel report from scan results
   */
  async generateExcelReport(results: ScanResult[]): Promise<Buffer> {
    console.log('[Scanner] Generating Excel report...');
    
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('策略摘要');
    
    summarySheet.addRow(['Option Samurai - Bi-Weekly Income 策略報告']);
    summarySheet.addRow([]);
    summarySheet.addRow(['報告生成時間', new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })]);
    summarySheet.addRow(['策略類型', 'Bull PUT Spread (牛市看跌價差)']);
    summarySheet.addRow(['到期日', results[0]?.expirationDate || 'N/A']);
    summarySheet.addRow(['距到期天數', `${results[0]?.daysToExpiration || 0} 天`]);
    summarySheet.addRow([]);
    summarySheet.addRow(['掃描結果統計']);
    summarySheet.addRow(['總交易機會數', results.length]);
    
    if (results.length > 0) {
      const avgProb = results.reduce((sum, r) => sum + r.profitProbability, 0) / results.length;
      const avgReturn = results.reduce((sum, r) => sum + r.returnRate, 0) / results.length;
      
      summarySheet.addRow(['平均獲利機率', `${avgProb.toFixed(2)}%`]);
      summarySheet.addRow(['平均報酬率', `${avgReturn.toFixed(2)}%`]);
    }
    
    // Style summary sheet
    summarySheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF4472C4' } };
    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 30;
    
    // Results sheet
    const resultsSheet = workbook.addWorksheet('掃描結果');
    
    // Headers
    const headers = [
      '排名', '股票代號', '公司名稱', '股價', '股價變動%', 'IV Rank %', 'IV值',
      '賣出履約價', '買入履約價', '距股價%_賣出', '距股價%_買入',
      '到期日', '距到期天數', '總選擇權成交量', '獲利機率%',
      '收到權利金', '最大獲利', '報酬率%'
    ];
    
    resultsSheet.addRow(headers);
    
    // Style headers
    const headerRow = resultsSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    
    // Add data rows
    results.forEach(result => {
      resultsSheet.addRow([
        result.rank,
        result.ticker,
        result.companyName,
        result.stockPrice,
        result.priceChange / 100,
        result.ivRank !== null ? result.ivRank / 100 : null,
        result.ivValue,
        result.sellStrike,
        result.buyStrike,
        result.sellDistance / 100,
        result.buyDistance / 100,
        result.expirationDate,
        result.daysToExpiration,
        result.totalVolume,
        result.profitProbability / 100,
        result.premium,
        result.maxProfit,
        result.returnRate / 100
      ]);
    });
    
    // Format columns
    resultsSheet.getColumn(4).numFmt = '$#,##0.00';
    resultsSheet.getColumn(5).numFmt = '0.00%';
    resultsSheet.getColumn(6).numFmt = '0.00%';
    resultsSheet.getColumn(8).numFmt = '$#,##0.00';
    resultsSheet.getColumn(9).numFmt = '$#,##0.00';
    resultsSheet.getColumn(10).numFmt = '0.00%';
    resultsSheet.getColumn(11).numFmt = '0.00%';
    resultsSheet.getColumn(14).numFmt = '#,##0';
    resultsSheet.getColumn(15).numFmt = '0.00%';
    resultsSheet.getColumn(16).numFmt = '$#,##0.00';
    resultsSheet.getColumn(17).numFmt = '$#,##0.00';
    resultsSheet.getColumn(18).numFmt = '0.00%';
    
    // Auto-fit columns
    resultsSheet.columns.forEach((column, index) => {
      if (index === 2) {
        column.width = 25;
      } else {
        column.width = 12;
      }
    });
    
    // Freeze header row
    resultsSheet.views = [{ state: 'frozen', ySplit: 1 }];
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    console.log('[Scanner] Excel report generated successfully');
    
    return Buffer.from(buffer);
  }

  /**
   * Execute full scan and generate report
   */
  async executeScan(): Promise<ScanReport> {
    try {
      await this.initialize();
      const results = await this.scanBiWeeklyIncome();
      const excelBuffer = await this.generateExcelReport(results);
      
      return {
        scanDate: new Date().toISOString(),
        strategy: 'bi-weekly income all',
        results,
        excelBuffer
      };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Cleanup browser resources
   */
  async cleanup(): Promise<void> {
    console.log('[Scanner] Cleaning up browser...');
    
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    
    console.log('[Scanner] Cleanup complete');
  }
}

