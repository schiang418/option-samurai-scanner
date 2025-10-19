/**
 * Browser-based Scanner Service
 * Uses persistent browser session for reliable scanning
 */

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

/**
 * Extract scan results from page HTML
 * This function is designed to be executed in the browser context
 */
export function extractScanResults(): ScanResult[] {
  const rows = Array.from(document.querySelectorAll('table tbody tr'));
  
  const results = rows.map((row, index) => {
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
    
    const result: ScanResult = {
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
    
    // Calculate premium and return rate
    const spreadWidth = (result.buyStrike - result.sellStrike) * 100;
    result.premium = result.maxProfit > 0 ? spreadWidth - result.maxProfit : 0;
    result.returnRate = result.premium > 0 ? (result.maxProfit / result.premium) * 100 : 0;
    
    return result;
  });
  
  return results;
}

/**
 * Generate Excel report from scan results
 */
export async function generateExcelReport(results: ScanResult[]): Promise<Buffer> {
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
  
  return Buffer.from(buffer);
}

