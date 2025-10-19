/**
 * Excel 報告生成器
 * 生成與 Option Samurai 相同格式的 Excel 報告
 */

import ExcelJS from 'exceljs';

interface ScanError {
  ticker: string;
  company_name: string;
  error_type: string;
  error_message: string;
}

interface Strategy {
  ticker: string;
  company_name: string;
  stock_price: number;
  stock_change_percent: number;
  iv_rank: number;
  iv: number;
  short_put_strike: number;
  long_put_strike: number;
  moneyness_short: number;
  moneyness_long: number;
  expiration: string;
  days_to_expiry: number;
  total_volume: number;
  prob_max_profit: number;
  premium: number;
  max_profit: number;
  return_on_risk: number;
}

export async function generateExcelReport(strategies: Strategy[], errors: ScanError[] = []): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  // 工作表 1: 策略摘要
  const summarySheet = workbook.addWorksheet('策略摘要');
  
  // 標題
  summarySheet.addRow(['Option Samurai - Bi-Weekly Income 策略報告 (Polygon.io)']);
  summarySheet.addRow([]);
  
  // 報告信息
  const now = new Date();
  const reportTime = now.toLocaleString('zh-TW', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });
  
  summarySheet.addRow(['報告生成時間', reportTime]);
  summarySheet.addRow(['策略類型', 'Bull PUT Spread (牛市看跌價差)']);
  
  if (strategies.length > 0) {
    summarySheet.addRow(['到期日', strategies[0].expiration]);
    summarySheet.addRow(['距到期天數', `${strategies[0].days_to_expiry} 天`]);
  }
  
  summarySheet.addRow([]);
  
  // 篩選條件
  summarySheet.addRow(['篩選條件']);
  summarySheet.addRow(['總選擇權成交量', '> 5,000']);
  summarySheet.addRow(['價內程度', '-15% 以下股價']);
  summarySheet.addRow(['到期日範圍', '10-18 天']);
  summarySheet.addRow(['Short PUT Delta', '1-20']);
  summarySheet.addRow(['最大獲利機率', '> 80%']);
  summarySheet.addRow(['價差寬度', '$40-60']);
  summarySheet.addRow(['最大獲利', '> $50']);
  summarySheet.addRow([]);
  
  // 統計
  summarySheet.addRow(['掃描結果統計']);
  summarySheet.addRow(['總交易機會數', strategies.length]);
  
  if (strategies.length > 0) {
    const avgProb = strategies.reduce((sum, s) => sum + s.prob_max_profit, 0) / strategies.length;
    const avgROR = strategies.reduce((sum, s) => sum + s.return_on_risk, 0) / strategies.length;
    const maxROR = Math.max(...strategies.map(s => s.return_on_risk));
    const maxProb = Math.max(...strategies.map(s => s.prob_max_profit));
    const maxRORTicker = strategies.find(s => s.return_on_risk === maxROR)?.ticker;
    const maxProbTicker = strategies.find(s => s.prob_max_profit === maxProb)?.ticker;
    
    summarySheet.addRow(['平均獲利機率', `${(avgProb * 100).toFixed(2)}%`]);
    summarySheet.addRow(['平均報酬率', `${(avgROR * 100).toFixed(2)}%`]);
    summarySheet.addRow(['最高報酬率', `${(maxROR * 100).toFixed(2)}% (${maxRORTicker})`]);
    summarySheet.addRow(['最高獲利機率', `${(maxProb * 100).toFixed(2)}% (${maxProbTicker})`]);
  }
  
  summarySheet.addRow([]);
  
  // 高報酬機會
  summarySheet.addRow(['高報酬機會 (報酬率 > 2%)']);
  const highReturns = strategies
    .filter(s => s.return_on_risk > 0.02)
    .sort((a, b) => b.return_on_risk - a.return_on_risk)
    .slice(0, 10);
  
  for (const strategy of highReturns) {
    summarySheet.addRow([
      strategy.ticker,
      `${(strategy.return_on_risk * 100).toFixed(2)}%`,
      `獲利機率: ${(strategy.prob_max_profit * 100).toFixed(2)}%`,
      `成交量: ${strategy.total_volume.toLocaleString()}`
    ]);
  }
  
  // 工作表 2: 掃描結果
  const resultsSheet = workbook.addWorksheet('掃描結果');
  
  // 表頭
  resultsSheet.addRow([
    '排名',
    '股票代號',
    '公司名稱',
    '股價',
    '股價變動%',
    'IV Rank %',
    'IV值',
    '賣出履約價',
    '買入履約價',
    '距股價%_賣出',
    '距股價%_買入',
    '到期日',
    '距到期天數',
    '總選擇權成交量',
    '獲利機率%',
    '收到權利金',
    '最大獲利',
    '報酬率%'
  ]);
  
  // 按獲利機率排序
  const sortedStrategies = [...strategies].sort((a, b) => b.prob_max_profit - a.prob_max_profit);
  
  // 數據行
  sortedStrategies.forEach((strategy, index) => {
    resultsSheet.addRow([
      index + 1,
      strategy.ticker,
      strategy.company_name,
      strategy.stock_price,
      strategy.stock_change_percent,
      strategy.iv_rank,
      strategy.iv,
      strategy.short_put_strike, // 賣出履約價 = Short PUT (較高行權價)
      strategy.long_put_strike,  // 買入履約價 = Long PUT (較低行權價)
      strategy.moneyness_long - 1,
      strategy.moneyness_short - 1,
      strategy.expiration,
      strategy.days_to_expiry,
      strategy.total_volume,
      strategy.prob_max_profit,
      strategy.premium,
      strategy.max_profit,
      strategy.return_on_risk
    ]);
  });
  
  // 設置列寬
  summarySheet.getColumn(1).width = 25;
  summarySheet.getColumn(2).width = 30;
  summarySheet.getColumn(3).width = 30;
  summarySheet.getColumn(4).width = 20;
  
  resultsSheet.columns.forEach(column => {
    column.width = 15;
  });
  
  // 工作表 3: 錯誤報告 (如果有錯誤)
  if (errors.length > 0) {
    const errorSheet = workbook.addWorksheet('錯誤報告');
    
    // 設置表頭
    errorSheet.addRow([
      '股票代碼',
      '公司名稱',
      '錯誤類型',
      '錯誤訊息'
    ]);
    
    // 設置表頭樣式
    const errorHeaderRow = errorSheet.getRow(1);
    errorHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    errorHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF0000' } // 紅色背景
    };
    errorHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // 添加錯誤數據
    errors.forEach(error => {
      const errorTypeMap: Record<string, string> = {
        'api_failed': 'API 失敗',
        'no_strategy': '無符合條件的策略',
        'low_volume': '交易量過低'
      };
      
      errorSheet.addRow([
        error.ticker,
        error.company_name,
        errorTypeMap[error.error_type] || error.error_type,
        error.error_message
      ]);
    });
    
    // 設置列寬
    errorSheet.getColumn(1).width = 15;
    errorSheet.getColumn(2).width = 30;
    errorSheet.getColumn(3).width = 20;
    errorSheet.getColumn(4).width = 50;
  }
  
  // 生成 Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

