#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Price list analysis configuration
const UPLOADS_DIR = 'K:\\00Project\\MantisNXT\\database\\Uploads\\drive-download-20250904T012253Z-1-001';
const OUTPUT_DIR = 'K:\\00Project\\MantisNXT\\claudedocs';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// File analysis functions
function analyzeExcelFile(filePath, fileName) {
    try {
        console.log(`📊 Analyzing Excel file: ${fileName}`);
        const workbook = xlsx.readFile(filePath);
        const sheetNames = workbook.SheetNames;

        let analysis = {
            fileName,
            fileType: 'Excel',
            fileSize: fs.statSync(filePath).size,
            sheets: []
        };

        sheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

            let sheetAnalysis = {
                sheetName,
                rowCount: jsonData.length,
                headers: jsonData[0] || [],
                sampleData: jsonData.slice(1, 6) // First 5 rows of data
            };

            // Identify potential product data columns
            if (sheetAnalysis.headers) {
                sheetAnalysis.potentialColumns = {
                    sku: findColumn(sheetAnalysis.headers, ['sku', 'code', 'product code', 'item code', 'part number']),
                    description: findColumn(sheetAnalysis.headers, ['description', 'product', 'item', 'name', 'title']),
                    price: findColumn(sheetAnalysis.headers, ['price', 'cost', 'retail', 'wholesale', 'amount', 'value']),
                    brand: findColumn(sheetAnalysis.headers, ['brand', 'manufacturer', 'make']),
                    category: findColumn(sheetAnalysis.headers, ['category', 'type', 'group', 'class']),
                    stock: findColumn(sheetAnalysis.headers, ['stock', 'qty', 'quantity', 'inventory', 'available'])
                };
            }

            analysis.sheets.push(sheetAnalysis);
        });

        return analysis;
    } catch (error) {
        console.error(`❌ Error analyzing ${fileName}:`, error.message);
        return {
            fileName,
            fileType: 'Excel',
            error: error.message
        };
    }
}

function analyzePDFFile(filePath, fileName) {
    return {
        fileName,
        fileType: 'PDF',
        fileSize: fs.statSync(filePath).size,
        note: 'PDF analysis requires manual processing or PDF parsing library'
    };
}

function findColumn(headers, searchTerms) {
    if (!Array.isArray(headers)) return null;

    for (let i = 0; i < headers.length; i++) {
        const header = String(headers[i]).toLowerCase();
        for (const term of searchTerms) {
            if (header.includes(term.toLowerCase())) {
                return { index: i, header: headers[i] };
            }
        }
    }
    return null;
}

// Main analysis function
async function analyzePriceLists() {
    console.log('🚀 Starting comprehensive price list analysis...');

    const files = fs.readdirSync(UPLOADS_DIR);
    const results = {
        totalFiles: files.length,
        analysisDate: new Date().toISOString(),
        summary: {
            excel: 0,
            pdf: 0,
            other: 0,
            totalDataRows: 0,
            uniqueSuppliers: new Set()
        },
        detailedAnalysis: []
    };

    for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        const stats = fs.statSync(filePath);

        if (!stats.isFile()) continue;

        const ext = path.extname(file).toLowerCase();
        let analysis;

        // Extract supplier name from filename
        const supplierName = file.replace(/\.xlsx?$|\.pdf$|\.xlsm?$/i, '')
                                .replace(/pricelist|price list|price_list/gi, '')
                                .replace(/_|-|\d{4}/g, ' ')
                                .trim();

        results.summary.uniqueSuppliers.add(supplierName);

        if (['.xlsx', '.xls', '.xlsm'].includes(ext)) {
            analysis = analyzeExcelFile(filePath, file);
            results.summary.excel++;

            if (analysis.sheets) {
                analysis.sheets.forEach(sheet => {
                    results.summary.totalDataRows += sheet.rowCount;
                });
            }
        } else if (ext === '.pdf') {
            analysis = analyzePDFFile(filePath, file);
            results.summary.pdf++;
        } else {
            analysis = { fileName: file, fileType: 'Other', fileSize: stats.size };
            results.summary.other++;
        }

        analysis.supplierName = supplierName;
        results.detailedAnalysis.push(analysis);
    }

    results.summary.uniqueSuppliers = Array.from(results.summary.uniqueSuppliers);

    // Write detailed analysis
    const reportPath = path.join(OUTPUT_DIR, 'price_list_analysis_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Generate summary report
    const summaryReport = generateSummaryReport(results);
    const summaryPath = path.join(OUTPUT_DIR, 'PRICE_LIST_ANALYSIS_SUMMARY.md');
    fs.writeFileSync(summaryPath, summaryReport);

    console.log(`✅ Analysis complete! Report saved to: ${summaryPath}`);
    console.log(`📊 Summary: ${results.summary.excel} Excel, ${results.summary.pdf} PDF, ${results.summary.other} other files`);
    console.log(`📈 Total data rows: ${results.summary.totalDataRows}`);
    console.log(`🏢 Unique suppliers: ${results.summary.uniqueSuppliers.length}`);

    return results;
}

function generateSummaryReport(results) {
    const { summary, detailedAnalysis } = results;

    let report = `# Price List Analysis Summary\n\n`;
    report += `**Analysis Date:** ${results.analysisDate}\n`;
    report += `**Total Files:** ${results.totalFiles}\n\n`;

    report += `## File Type Distribution\n`;
    report += `- Excel Files: ${summary.excel}\n`;
    report += `- PDF Files: ${summary.pdf}\n`;
    report += `- Other Files: ${summary.other}\n\n`;

    report += `## Data Overview\n`;
    report += `- Total Data Rows: ${summary.totalDataRows.toLocaleString()}\n`;
    report += `- Unique Suppliers: ${summary.uniqueSuppliers.length}\n\n`;

    report += `## Supplier List\n`;
    summary.uniqueSuppliers.forEach((supplier, index) => {
        report += `${index + 1}. ${supplier}\n`;
    });

    report += `\n## Processing Recommendations\n\n`;

    // Excel files analysis
    const excelFiles = detailedAnalysis.filter(f => f.fileType === 'Excel' && !f.error);
    if (excelFiles.length > 0) {
        report += `### Excel Files Ready for Processing (${excelFiles.length})\n`;

        excelFiles.forEach(file => {
            if (file.sheets) {
                report += `\n**${file.fileName}**\n`;
                file.sheets.forEach(sheet => {
                    report += `- Sheet: ${sheet.sheetName} (${sheet.rowCount} rows)\n`;
                    if (sheet.potentialColumns.sku) {
                        report += `  - SKU Column: ${sheet.potentialColumns.sku.header}\n`;
                    }
                    if (sheet.potentialColumns.description) {
                        report += `  - Description Column: ${sheet.potentialColumns.description.header}\n`;
                    }
                    if (sheet.potentialColumns.price) {
                        report += `  - Price Column: ${sheet.potentialColumns.price.header}\n`;
                    }
                });
            }
        });
    }

    // PDF files
    const pdfFiles = detailedAnalysis.filter(f => f.fileType === 'PDF');
    if (pdfFiles.length > 0) {
        report += `\n### PDF Files Requiring Manual Processing (${pdfFiles.length})\n`;
        pdfFiles.forEach(file => {
            const sizeMB = (file.fileSize / 1024 / 1024).toFixed(2);
            report += `- ${file.fileName} (${sizeMB} MB)\n`;
        });
    }

    report += `\n## Next Steps\n`;
    report += `1. **Database Schema Enhancement**: Add columns for price lists, SKU variations, supplier mappings\n`;
    report += `2. **Data Import Pipeline**: Create automated import for Excel files\n`;
    report += `3. **PDF Processing**: Implement PDF parsing for manual price lists\n`;
    report += `4. **Data Validation**: Implement SKU validation and duplicate detection\n`;
    report += `5. **Supplier Mapping**: Map price list data to existing supplier records\n`;

    return report;
}

// Run analysis if called directly
if (require.main === module) {
    analyzePriceLists().catch(console.error);
}

module.exports = { analyzePriceLists, analyzeExcelFile };