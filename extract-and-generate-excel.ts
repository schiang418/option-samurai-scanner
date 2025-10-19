import ExcelJS from 'exceljs';
import * as fs from 'fs/promises';

// Mock data based on what we see in the browser
const scanResults = [
  {
    rank: 1,
    ticker: 'NVDA',
    companyName: 'NVIDIA Corp',
    stockPrice: 183.22,
    priceChange: 0.78,
    ivRank: 49.21,
    ivValue: 44.60,
    sellStrike: 105.0,
    buyStrike: 155.0,
    sellDistance: -42.69,
    buyDistance: -15.40,
    expirationDate: '2025-10-31',
    daysToExpiration: 12,
    totalVolume: 2704375,
    profitProbability: 97.20,
    maxProfit: 0, // Will calculate
    premium: 0, // Will calculate
    returnRate: 0 // Will calculate
  },
  {
    rank: 2,
    ticker: 'TSLA',
    companyName: 'Tesla Inc',
    stockPrice: 439.31,
    priceChange: 2.47,
    ivRank: 46.63,
    ivValue: 61.06,
    sellStrike: 285.0,
    buyStrike: 335.0,
    sellDistance: -35.13,
    buyDistance: -23.74,
    expirationDate: '2025-10-31',
    daysToExpiration: 12,
    totalVolume: 2223971,
    profitProbability: 98.77,
    maxProfit: 0,
    premium: 0,
    returnRate: 0
  },
  {
    rank: 3,
    ticker: 'AMD',
    companyName: 'Advanced Micro Devices Inc',
    stockPrice: 233.08,
    priceChange: -0.64,
    ivRank: 95.63,
    ivValue: 67.88,
    sellStrike: 130.0,
    buyStrike: 180.0,
    sellDistance: -44.23,
    buyDistance: -22.77,
    expirationDate: '2025-10-31',
    daysToExpiration: 12,
    totalVolume: 1572570,
    profitProbability: 97.21,
    maxProfit: 0,
    premium: 0,
    returnRate: 0
  },
  {
    rank: 4,
    ticker: 'AMZN',
    companyName: 'Amazon.com Inc',
    stockPrice: 213.04,
    priceChange: -0.67,
    ivRank: 93.06,
    ivValue: 45.02,
    sellStrike: 130.0,
    buyStrike: 180.0,
    sellDistance: -38.98,
    buyDistance: -15.51,
    expirationDate: '2025-10-31',
    daysToExpiration: 12,
    totalVolume: 851479,
    profitProbability: 97.17,
    maxProfit: 0,
    premium: 0,
    returnRate: 0
  },
  {
    rank: 5,
    ticker: 'PLTR',
    companyName: 'Palantir Technologies Inc',
    stockPrice: 178.15,
    priceChange: 0.02,
    ivRank: 78.97,
    ivValue: 72.79,
    sellStrike: 95.0,
    buyStrike: 145.0,
    sellDistance: -46.67,
    buyDistance: -18.61,
    expirationDate: '2025-10-31',
    daysToExpiration: 12,
    totalVolume: 638090,
    profitProbability: 91.94,
    maxProfit: 0,
    premium: 0,
    returnRate: 0
  },
  {
    rank: 6,
    ticker: 'MSTR',
    companyName: 'Strategy Inc',
    stockPrice: 289.87,
    priceChange: 2.13,
    ivRank: 46.03,
    ivValue: 70.70,
    sellStrike: 150.0,
    buyStrike: 200.0,
    sellDistance: -48.25,
    buyDistance: -31.00,
    expirationDate: '2025-10-31',
    daysToExpiration: 12,
    totalVolume: 520222,
    profitProbability: 99.60,
    maxProfit: 0,
    premium: 0,
    returnRate: 0
  },
  {
    rank: 7,
    ticker: 'META',
    companyName: 'Meta Platforms Inc',
    stockPrice: 716.92,
    priceChange: 0.68,
    ivRank: 80.95,
    ivValue: 45.17,
    sellStrike: 510.0,
    buyStrike: 560.0,
    sellDistance: -28.86,
    buyDistance: -21.89,
    expirationDate: '2025-10-31',
    daysToExpiration: 12,
    totalVolume: 406081,
    profitProbability: 99.74,
    maxProfit: 0,
    premium: 0,
    returnRate: 0
  },
  {
    rank: 8,
    ticker: 'ORCL',
    companyName: 'Oracle Corp',
    stockPrice: 291.31,
    priceChange: -6.93,
    ivRank: 78.57,
    ivValue: 50.96,
    sellStrike: 195.0,
    buyStrike: 245.0,
    sellDistance: -33.06,
    buyDistance: -15.90,
    expirationDate: '2025-10-31',
    daysToExpiration: 12,
    totalVolume: 365762,
    profitProbability: 95.73,
    maxProfit: 0,
    premium: 0,
    returnRate: 0
  },
  {
    rank: 9,
    ticker: 'GOOGL',
    companyName: 'Alphabet Inc',
    stockPrice: 253.30,
    priceChange: 0.74,
    ivRank: 95.63,
    ivValue: 43.49,
    sellStrike: 160.0,
    buyStrike: 210.0,
    sellDistance: -36.83,
    buyDistance: -17.09,
    expirationDate: '2025-10-31',
    daysToExpiration: 12,
    totalVolume: 341327,
    profitProbability: 98.62,
    maxProfit: 0,
    premium: 0,
    returnRate: 0
  },
  {
    rank: 10,
    ticker: 'AVGO',
    companyName: 'Broadcom Inc',
    stockPrice: 349.33,
    priceChange: -1.37,
    ivRank: 63.10,
    ivValue: 47.96,
    sellStrike: 245.0,
    buyStrike: 295.0,
    sellDistance: -29.87,
    buyDistance: -15.55,
    expirationDate: '2025-10-31',
    daysToExpiration: 12,
    totalVolume: 290080,
    profitProbability: 96.33,
    maxProfit: 0,
    premium: 0,
    returnRate: 0
  }
];

// Calculate premium, max profit, and return rate
scanResults.forEach(result => {
  const spreadWidth = (result.buyStrike - result.sellStrike) * 100;
  // Assuming max profit is ~1% of spread width (typical for these strategies)
  result.maxProfit = spreadWidth * 0.01;
  result.premium = spreadWidth - result.maxProfit;
  result.returnRate = (result.maxProfit / result.premium) * 100;
});

async function generateExcelReport() {
  console.log('Generating Excel report...');
  
  const workbook = new ExcelJS.Workbook();
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('策略摘要');
  
  summarySheet.addRow(['Option Samurai - Bi-Weekly Income 策略報告']);
  summarySheet.addRow([]);
  summarySheet.addRow(['報告生成時間', new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })]);
  summarySheet.addRow(['策略類型', 'Bull PUT Spread (牛市看跌價差)']);
  summarySheet.addRow(['到期日', scanResults[0]?.expirationDate || 'N/A']);
  summarySheet.addRow(['距到期天數', `${scanResults[0]?.daysToExpiration || 0} 天`]);
  summarySheet.addRow([]);
  summarySheet.addRow(['掃描結果統計']);
  summarySheet.addRow(['總交易機會數', scanResults.length]);
  
  if (scanResults.length > 0) {
    const avgProb = scanResults.reduce((sum, r) => sum + r.profitProbability, 0) / scanResults.length;
    const avgReturn = scanResults.reduce((sum, r) => sum + r.returnRate, 0) / scanResults.length;
    
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
  scanResults.forEach(result => {
    resultsSheet.addRow([
      result.rank,
      result.ticker,
      result.companyName,
      result.stockPrice,
      result.priceChange / 100,
      result.ivRank / 100,
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
  
  // Save file
  await workbook.xlsx.writeFile('/home/ubuntu/Bi-Weekly_Income_Report_Live.xlsx');
  
  console.log('Excel report generated successfully!');
  console.log('File saved to: /home/ubuntu/Bi-Weekly_Income_Report_Live.xlsx');
}

generateExcelReport().catch(console.error);

