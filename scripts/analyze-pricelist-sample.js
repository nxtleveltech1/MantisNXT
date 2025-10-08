const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function analyzePricelistSample() {
  const uploadsDir = path.join(__dirname, '..', 'database', 'Uploads', 'drive-download-20250904T012253Z-1-001');

  try {
    // Get list of Excel files
    const files = fs.readdirSync(uploadsDir)
      .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
      .slice(0, 3); // Analyze first 3 Excel files

    console.log(`📋 Analyzing ${files.length} Excel price list files:`);

    for (const filename of files) {
      console.log(`\n🔍 Analyzing: ${filename}`);

      try {
        const workbook = new ExcelJS.Workbook();
        const filepath = path.join(uploadsDir, filename);
        await workbook.xlsx.readFile(filepath);

        console.log(`  📊 Worksheets: ${workbook.worksheets.length}`);

        workbook.worksheets.forEach((worksheet, index) => {
          console.log(`    Sheet ${index + 1}: "${worksheet.name}" (${worksheet.rowCount} rows, ${worksheet.columnCount} cols)`);

          // Get first few rows to understand structure
          if (worksheet.rowCount > 0) {
            console.log(`    📄 First 3 rows:`);
            for (let rowNum = 1; rowNum <= Math.min(3, worksheet.rowCount); rowNum++) {
              const row = worksheet.getRow(rowNum);
              const values = [];
              for (let colNum = 1; colNum <= Math.min(10, row.cellCount); colNum++) {
                const cell = row.getCell(colNum);
                values.push(cell.text || cell.value || '');
              }
              console.log(`      Row ${rowNum}: [${values.join(' | ')}]`);
            }
          }
        });

      } catch (error) {
        console.log(`  ❌ Error reading ${filename}: ${error.message}`);
      }
    }

    // Also check for PDF files
    const pdfFiles = fs.readdirSync(uploadsDir)
      .filter(file => file.endsWith('.pdf'));

    console.log(`\n📄 Found ${pdfFiles.length} PDF files: ${pdfFiles.join(', ')}`);

  } catch (error) {
    console.error('❌ Error analyzing price lists:', error.message);
  }
}

analyzePricelistSample();