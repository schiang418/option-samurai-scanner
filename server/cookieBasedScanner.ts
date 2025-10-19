/**
 * Cookie-based Option Samurai Scanner
 * Uses pre-saved cookies to bypass login
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import ExcelJS from 'exceljs';
import * as fs from 'fs/promises';
import * as path from 'path';

puppeteer.use(StealthPlugin());

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

export class CookieBasedScanner {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cookiesFile = path.join(process.cwd(), 'option-samurai-cookies.json');

  /**
   * Initialize browser with saved cookies
   */
  async initialize(): Promise<void> {
    console.log('[Scanner] Launching browser with saved cookies...');
    
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
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    // Load cookies if available
    await this.loadCookies();
    
    // Verify we can access the screener
    await this.verifyAccess();
  }

  /**
   * Load cookies from file
   */
  async loadCookies(): Promise<void> {
    try {
      const cookiesData = await fs.readFile(this.cookiesFile, 'utf-8');
      const cookies: any[] = JSON.parse(cookiesData);
      
      if (cookies && cookies.length > 0) {
        await this.page!.setCookie(...cookies);
        console.log(`[Scanner] Loaded ${cookies.length} cookies`);
      } else {
        console.log('[Scanner] No cookies found, will need manual login');
      }
    } catch (error) {
      console.log('[Scanner] No saved cookies found, will need manual login');
    }
  }

  /**
   * Verify we have access to Option Samurai
   */
  async verifyAccess(): Promise<void> {
    console.log('[Scanner] Verifying access to Option Samurai...');
    
    await this.page!.goto('https://new.optionsamurai.com/screener', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    const currentUrl = this.page!.url();
    
    if (currentUrl.includes('auth.optionsamurai.com')) {
      throw new Error('未登入 Option Samurai。請按照 COOKIE_SETUP.md 的說明提取並保存 cookies。');
    }
    
    console.log('[Scanner] Access verified!');
  }

  /**
   * Execute bi-weekly income scan
   */
  async scanBiWeeklyIncome(): Promise<ScanResult[]> {
    if (!this.page) {
      throw new Error('Scanner not initialized');
    }

    console.log('[Scanner] Navigating to bi-weekly income scan...');
    
    await this.page.goto('https://new.optionsamurai.com/screener/scan/44060', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });
    
    console.log('[Scanner] Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Click RUN SCAN if button exists
    try {
      const runScanButton = await this.page.waitForSelector('button:has-text("RUN SCAN")', { 
        timeout: 5000 
      }).catch(() => null);
      
      if (runScanButton) {
        console.log('[Scanner] Clicking RUN SCAN...');
        await runScanButton.click();
        await this.page.waitForNetworkIdle({ timeout: 40000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.log('[Scanner] No RUN SCAN button or already loaded');
    }
    
    // Check for no results
    const noResults = await this.page.evaluate(() => {
      return document.body.textContent?.includes('There are no options in the market that fit the scan criteria') || false;
    });
    
    if (noResults) {
      console.log('[Scanner] No results found');
      return [];
    }
    
    // Wait for table
    console.log('[Scanner] Waiting for results table...');
    try {
      await this.page.waitForSelector('table tbody tr', { timeout: 30000 });
    } catch (error) {
      console.log('[Scanner] No results table found');
      await this.page.screenshot({ path: '/tmp/cookie-scan-error.png' });
      return [];
    }
    
    console.log('[Scanner] Extracting results...');
    
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
        
        const tickerCell = cells[0];
        const ticker = getText(tickerCell?.querySelector('div > div:first-child'));
        const companyName = getText(tickerCell?.querySelector('div > div:nth-child(2)'));
        
        const priceCell = cells[1];
        const priceText = getText(priceCell?.querySelector('div > div:first-child'));
        const changeText = getText(priceCell?.querySelector('div > div:nth-child(2)'));
        
        const ivCell = cells[2];
        const ivRankText = getText(ivCell?.querySelector('div > div:first-child'));
        const ivValueText = getText(ivCell?.querySelector('div > div:nth-child(2)'));
        
        const strikeCell = cells[3];
        const strikeText = getText(strikeCell);
        const strikeMatch = strikeText.match(/([\d.]+)\/([\d.]+)/);
        const sellStrike = strikeMatch ? parseFloat(strikeMatch[1]) : 0;
        const buyStrike = strikeMatch ? parseFloat(strikeMatch[2]) : 0;
        
        const distanceMatch = strikeText.match(/(-?[\d.]+)%\/(-?[\d.]+)%/);
        const sellDistance = distanceMatch ? parseFloat(distanceMatch[1]) : 0;
        const buyDistance = distanceMatch ? parseFloat(distanceMatch[2]) : 0;
        
        const expCell = cells[4];
        const expDate = getText(expCell?.querySelector('div > div:first-child'));
        const daysText = getText(expCell?.querySelector('div > div:nth-child(2)'));
        const daysMatch = daysText.match(/\d+/);
        const daysToExpiration = daysMatch ? parseInt(daysMatch[0]) : 0;
        
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

    results.forEach(result => {
      const spreadWidth = (result.buyStrike - result.sellStrike) * 100;
      result.premium = result.maxProfit > 0 ? spreadWidth - result.maxProfit : 0;
      result.returnRate = result.premium > 0 ? (result.maxProfit / result.premium) * 100 : 0;
    });

    console.log(`[Scanner] Extracted ${results.length} results`);
    
    return results;
  }

  /**
   * Generate Excel report
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
    
    summarySheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF4472C4' } };
    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 30;
    
    // Results sheet
    const resultsSheet = workbook.addWorksheet('掃描結果');
    
    const headers = [
      '排名', '股票代號', '公司名稱', '股價', '股價變動%', 'IV Rank %', 'IV值',
      '賣出履約價', '買入履約價', '距股價%_賣出', '距股價%_買入',
      '到期日', '距到期天數', '總選擇權成交量', '獲利機率%',
      '收到權利金', '最大獲利', '報酬率%'
    ];
    
    resultsSheet.addRow(headers);
    
    const headerRow = resultsSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    
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
    
    resultsSheet.columns.forEach((column, index) => {
      if (index === 2) {
        column.width = 25;
      } else {
        column.width = 12;
      }
    });
    
    resultsSheet.views = [{ state: 'frozen', ySplit: 1 }];
    
    const buffer = await workbook.xlsx.writeBuffer();
    
    console.log('[Scanner] Excel report generated');
    
    return Buffer.from(buffer);
  }

  /**
   * Execute full scan
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
   * Cleanup
   */
  async cleanup(): Promise<void> {
    console.log('[Scanner] Cleaning up...');
    
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

