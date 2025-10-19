import { AdvancedScanner } from './server/advancedScanner';
import * as fs from 'fs';

async function test() {
  console.log('Testing AdvancedScanner...');
  
  try {
    const scanner = new AdvancedScanner();
    const report = await scanner.executeScan();
    
    console.log('✅ Scan successful!');
    console.log(`Results: ${report.results.length}`);
    console.log(`Strategy: ${report.strategy}`);
    
    if (report.results.length > 0) {
      console.log('\nFirst 3 results:');
      report.results.slice(0, 3).forEach((r, i) => {
        console.log(`${i + 1}. ${r.ticker} - ${r.company} - ${r.maxProfit}`);
      });
      
      // Save Excel file
      fs.writeFileSync('/tmp/scan-results.xlsx', report.excelBuffer);
      console.log('\n📊 Excel file saved to /tmp/scan-results.xlsx');
    } else {
      console.log('\n⚠️ No results found. Check screenshots in /tmp/');
    }
  } catch (error) {
    console.error('❌ Scan failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
  }
}

test();

