import { PuppeteerScanner } from './server/puppeteerScanner';
import * as fs from 'fs/promises';

async function testScanner() {
  console.log('Starting Puppeteer scanner test...');
  
  const scanner = new PuppeteerScanner();
  
  try {
    const report = await scanner.executeScan();
    
    console.log('\n✅ Scan completed successfully!');
    console.log(`Strategy: ${report.strategy}`);
    console.log(`Scan Date: ${report.scanDate}`);
    console.log(`Results Count: ${report.results.length}`);
    
    if (report.results.length > 0) {
      console.log('\nTop 5 Results:');
      report.results.slice(0, 5).forEach(result => {
        console.log(`  ${result.rank}. ${result.ticker} - ${result.companyName}`);
        console.log(`     Price: $${result.stockPrice}, Probability: ${result.profitProbability}%`);
      });
    }
    
    // Save Excel file
    await fs.writeFile('/home/ubuntu/Puppeteer_Scan_Test.xlsx', report.excelBuffer);
    console.log('\n📊 Excel report saved to: /home/ubuntu/Puppeteer_Scan_Test.xlsx');
    
  } catch (error) {
    console.error('\n❌ Scan failed:');
    console.error(error);
    process.exit(1);
  }
}

testScanner();

