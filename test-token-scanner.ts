import { TokenBasedScanner } from './server/tokenBasedScanner';

async function test() {
  console.log('Testing TokenBasedScanner...');
  
  try {
    const scanner = new TokenBasedScanner();
    const report = await scanner.executeScan();
    
    console.log('✅ Scan successful!');
    console.log(`Results: ${report.results.length}`);
    console.log(`Strategy: ${report.strategy}`);
    
    if (report.results.length > 0) {
      console.log('\nFirst result:', report.results[0]);
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

