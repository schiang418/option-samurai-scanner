/**
 * Option Samurai Scanner with Improved Waiting Logic
 * Automates scanning of bi-weekly income strategies
 */

import { chromium, Browser, Page } from 'playwright';
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

export class OptionSamuraiScanner {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Initialize browser and login
   */
  async initialize(): Promise<void> {
    console.log('[Scanner] Initializing browser...');
    
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await this.browser.newContext();
    this.page = await context.newPage();

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
    await this.page.goto('https://auth.optionsamurai.com/login');

    console.log('[Scanner] Filling login form...');
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);

    console.log('[Scanner] Submitting login...');
    await this.page.click('button[type="submit"]');

    // Wait for navigation to screener page
    console.log('[Scanner] Waiting for login to complete...');
    await this.page.waitForURL('**/screener**', { timeout: 30000 });
    
    console.log('[Scanner] Login successful!');
  }

  /**
   * Wait for scan to complete by monitoring network activity
   */
  private async waitForScanCompletion(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    console.log('[Scanner] Waiting for scan to complete...');
    
    // Strategy 1: Wait for loading indicator to disappear
    try {
      await this.page.waitForSelector('.loading, [aria-busy="true"]', { 
        state: 'hidden', 
        timeout: 5000 
      });
      console.log('[Scanner] Loading indicator disappeared');
    } catch (e) {
      console.log('[Scanner] No loading indicator found, continuing...');
    }

    // Strategy 2: Wait for table rows to appear OR "no results" message
    console.log('[Scanner] Waiting for results or no-results message...');
    
    await Promise.race([
      this.page.waitForSelector('table tbody tr', { timeout: 30000 }),
      this.page.waitForSelector('text=There are no options', { timeout: 30000 })
    ]);

    // Give extra time for all rows to render
    await this.page.waitForTimeout(2000);
    
    console.log('[Scanner] Scan completion detected');
  }

  /**
   * Execute bi-weekly income scan
   */
  async scanBiWeeklyIncome(): Promise<ScanResult[]> {
    if (!this.page) {
      throw new Error('Scanner not initialized. Call initialize() first.');
    }

    console.log('[Scanner] Navigating directly to bi-weekly income scan...');
    
    // Navigate directly to the scan URL - this will trigger auto-load
    await this.page.goto('https://new.optionsamurai.com/screener/scan/44060', { 
      waitUntil: 'networkidle',
      timeout: 45000 
    });
    
    console.log('[Scanner] Page loaded, waiting for scan results...');
    
    // Wait a bit for initial page render
    await this.page.waitForTimeout(5000);
    
    // Try clicking RUN SCAN if it exists
    try {
      const runScanBtn = this.page.locator('button:has-text("RUN SCAN")');
      const btnCount = await runScanBtn.count();
      
      if (btnCount > 0) {
        console.log('[Scanner] Found RUN SCAN button, clicking...');
        await runScanBtn.first().click({ timeout: 5000 });
        console.log('[Scanner] Clicked RUN SCAN, waiting for results...');
        await this.page.waitForTimeout(10000); // Wait longer for scan to complete
      } else {
        console.log('[Scanner] No RUN SCAN button found, results may already be loading');
        await this.page.waitForTimeout(5000);
      }
    } catch (error) {
      console.log('[Scanner] Could not interact with RUN SCAN button:', error);
      await this.page.waitForTimeout(5000);
    }
    
    // Now wait for scan completion
    await this.waitForScanCompletion();
    
    // Check if there are results
    const noResults = await this.page.locator('text=There are no options').count();
    if (noResults > 0) {
      console.log('[Scanner] No results found for current market conditions');
      return [];
    }
    
    // Check if table exists
    const tableExists = await this.page.locator('table tbody tr').count();
    if (tableExists === 0) {
      console.log('[Scanner] No results table found');
      // Take screenshot for debugging
      await this.page.screenshot({ path: '/tmp/scan-no-results.png' });
      return [];
    }
    
    console.log('[Scanner] Extracting scan results...');
    
    // Extract all result rows using page.evaluate for better reliability
    const results = await this.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      
      return rows.map((row, index) => {
        const cells = Array.from(row.querySelectorAll('td'));
        
        // Helper to extract text content
        const getText = (cell: Element | undefined) => cell?.textContent?.trim() || '';
        
        // Helper to parse number from text
        const parseNum = (text: string): number => {
          const cleaned = text.replace(/[$,%]/g, '').trim();
          return parseFloat(cleaned) || 0;
        };
        
        // Extract ticker and company name
        const tickerCell = cells[0];
        const tickerDiv = tickerCell?.querySelector('div > div:first-child');
        const ticker = tickerDiv?.textContent?.trim() || '';
        const companyDiv = tickerCell?.querySelector('div > div:nth-child(2)');
        const companyName = companyDiv?.textContent?.trim() || '';
        
        // Extract stock price and change
        const priceCell = cells[1];
        const priceDiv = priceCell?.querySelector('div > div:first-child');
        const priceText = priceDiv?.textContent?.trim() || '';
        const changeDiv = priceCell?.querySelector('div > div:nth-child(2)');
        const changeText = changeDiv?.textContent?.trim() || '';
        
        // Extract IV Rank
        const ivCell = cells[2];
        const ivRankDiv = ivCell?.querySelector('div > div:first-child');
        const ivRankText = ivRankDiv?.textContent?.trim() || '';
        const ivValueDiv = ivCell?.querySelector('div > div:nth-child(2)');
        const ivValueText = ivValueDiv?.textContent?.trim() || '';
        
        // Extract strikes
        const strikeCell = cells[3];
        const strikeText = getText(strikeCell);
        const strikeMatch = strikeText.match(/([\d.]+)\/([\d.]+)/);
        const sellStrike = strikeMatch ? parseFloat(strikeMatch[1]) : 0;
        const buyStrike = strikeMatch ? parseFloat(strikeMatch[2]) : 0;
        
        // Extract distances
        const distanceText = getText(strikeCell);
        const distanceMatch = distanceText.match(/(-?[\d.]+)%\/(-?[\d.]+)%/);
        const sellDistance = distanceMatch ? parseFloat(distanceMatch[1]) : 0;
        const buyDistance = distanceMatch ? parseFloat(distanceMatch[2]) : 0;
        
        // Extract expiration
        const expCell = cells[4];
        const expDateDiv = expCell?.querySelector('div > div:first-child');
        const expDate = expDateDiv?.textContent?.trim() || '';
        const daysDiv = expCell?.querySelector('div > div:nth-child(2)');
        const daysText = daysDiv?.textContent?.trim() || '';
        const daysMatch = daysText.match(/\d+/);
        const daysToExpiration = daysMatch ? parseInt(daysMatch[0]) : 0;
        
        // Extract volume
        const volumeText = getText(cells[5]);
        
        // Extract probability
        const probText = getText(cells[6]);
        
        // Extract max profit
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
          premium: 0, // Calculated from maxProfit and spread width
          maxProfit: parseNum(profitText),
          returnRate: 0 // Will be calculated
        };
      });
    });

    // Calculate premium and return rate for each result
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
    resultsSheet.getColumn(4).numFmt = '$#,##0.00';  // Stock Price
    resultsSheet.getColumn(5).numFmt = '0.00%';      // Price Change
    resultsSheet.getColumn(6).numFmt = '0.00%';      // IV Rank
    resultsSheet.getColumn(8).numFmt = '$#,##0.00';  // Sell Strike
    resultsSheet.getColumn(9).numFmt = '$#,##0.00';  // Buy Strike
    resultsSheet.getColumn(10).numFmt = '0.00%';     // Sell Distance
    resultsSheet.getColumn(11).numFmt = '0.00%';     // Buy Distance
    resultsSheet.getColumn(14).numFmt = '#,##0';     // Volume
    resultsSheet.getColumn(15).numFmt = '0.00%';     // Profit Probability
    resultsSheet.getColumn(16).numFmt = '$#,##0.00'; // Premium
    resultsSheet.getColumn(17).numFmt = '$#,##0.00'; // Max Profit
    resultsSheet.getColumn(18).numFmt = '0.00%';     // Return Rate
    
    // Auto-fit columns
    resultsSheet.columns.forEach((column, index) => {
      if (index === 2) { // Company name
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

