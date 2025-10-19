import { FinalScanner } from './server/finalScanner';
import * as fs from 'fs';

async function test() {
  console.log('Testing FinalScanner with cookies + localStorage...');
  
  try {
    const scanner = new FinalScanner();
    const report = await scanner.executeScan();
    
    console.log('✅ Scan successful!');
    console.log(`Results: ${report.results.length}`);
    console.log(`Strategy: ${report.strategy}`);
    
    if (report.results.length > 0) {
      console.log('\nFirst 5 results:');
      report.results.slice(0, 5).forEach((r, i) => {
        console.log(`${i + 1}. ${r.ticker} - ${r.company} - ${r.maxProfit}`);
      });
      
      // Save Excel file
      fs.writeFileSync('/tmp/final-scan-results.xlsx', report.excelBuffer);
      console.log('\n📊 Excel file saved to /tmp/final-scan-results.xlsx');
    } else {
      console.log('\n⚠️ No results found. Check screenshots in /tmp/');
    }
  } catch (error) {
    console.error('❌ Scan failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

test();

