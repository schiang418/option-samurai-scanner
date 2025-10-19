import { OptionSamuraiScanner } from './server/optionSamuraiScanner';

async function testScanner() {
  console.log('Starting scanner test...');
  
  const scanner = new OptionSamuraiScanner();
  
  try {
    const report = await scanner.executeScan();
    console.log('✅ Scan successful!');
    console.log(`Found ${report.results.length} results`);
    console.log(`Excel buffer size: ${report.excelBuffer.length} bytes`);
  } catch (error) {
    console.error('❌ Scan failed:');
    console.error(error);
  }
}

testScanner();

