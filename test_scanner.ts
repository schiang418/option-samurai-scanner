import { scanMarket, DEFAULT_TICKERS } from './server/polygonScanner';
import { generateExcelReport } from './server/excelGenerator';
import fs from 'fs';

(async () => {
  console.log('開始掃描前 5 個股票...');
  const strategies = await scanMarket(DEFAULT_TICKERS.slice(0, 5));
  console.log(`找到 ${strategies.length} 個策略`);
  
  if (strategies.length > 0) {
    const buffer = await generateExcelReport(strategies);
    fs.writeFileSync('/home/ubuntu/test_polygon_report.xlsx', buffer);
    console.log('✅ Excel 已生成: /home/ubuntu/test_polygon_report.xlsx');
  } else {
    console.log('❌ 沒有找到策略');
  }
})();
