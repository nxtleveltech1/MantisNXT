# Comprehensive Supplier Pricelist Processor
# This script systematically processes each supplier file and consolidates data into a standardized workbook

param(
    [string]$SourcePath = "K:\00Project\MantisNXT\database\Uploads\drive-download-20250904T012253Z-1-001",
    [string]$OutputPath = "K:\00Project\MantisNXT\database\Uploads\Consolidated_Supplier_Data.xlsx"
)

Write-Host "=== Comprehensive Supplier Pricelist Processor ===" -ForegroundColor Cyan
Write-Host "Source: $SourcePath" -ForegroundColor Gray
Write-Host "Output: $OutputPath" -ForegroundColor Gray
Write-Host ""

# Check if ImportExcel module is available
if (-not (Get-Module -ListAvailable -Name ImportExcel)) {
    Write-Host "Installing ImportExcel module..." -ForegroundColor Yellow
    Install-Module -Name ImportExcel -Force -Scope CurrentUser -AllowClobber
}

Import-Module ImportExcel

# Initialize consolidated data array
$consolidatedData = @()
$processingLog = @()

# Standard column mapping
$standardColumns = @{
    'Supplier_Name' = ''
    'Date_Processed' = ''
    'Source_File' = ''
    'Brand_Name' = ''
    'SKU' = ''
    'Model_Number' = ''
    'Product_Description' = ''
    'Cost_Price_Excl_VAT' = ''
    'Cost_Price_Incl_VAT' = ''
    'Retail_Price_Excl_VAT' = ''
    'Retail_Price_Incl_VAT' = ''
    'RRP' = ''
    'Dealer_Price' = ''
    'VAT_Rate' = ''
    'Stock_Quantity' = ''
    'SOH' = ''
    'Available_Stock' = ''
    'Category' = ''
    'Subcategory' = ''
    'Barcode' = ''
    'Unit' = ''
    'Weight' = ''
    'Dimensions' = ''
    'Lead_Time' = ''
    'Min_Order_Qty' = ''
    'Notes' = ''
}

function Extract-SupplierName {
    param([string]$fileName)
    
    $supplierMap = @{
        'ACTIVE MUSIC' = 'Active Music Distribution'
        'Alpha-Technologies' = 'Alpha Technologies'
        'ApexPro' = 'ApexPro Distribution'
        'Audiolite' = 'Audiolite'
        'Audiosure' = 'Audiosure'
        'AV Distribution' = 'AV Distribution'
        'BK_Percussion' = 'BK Percussion'
        'GLOBAL MUSIC' = 'Global Music'
        'Legacy Brands' = 'Legacy Brands'
        'MD External' = 'MD External'
        'MM Pricelist' = 'MM'
        'Music Power' = 'Music Power'
        'Planetworld' = 'Planetworld'
        'Pro Audio' = 'Pro Audio Platinum'
        'Rockit' = 'Rockit'
        'Rolling Thunder' = 'Rolling Thunder'
        'Sennheiser' = 'Sennheiser'
        'SonicInformed' = 'Sonic Informed'
        'Stage Audio' = 'Stage Audio Works'
        'Stage one' = 'Stage One'
        'Tuerk Multimedia' = 'Tuerk Multimedia'
        'Tuerk Tech' = 'Tuerk Tech'
        'Viva Afrika' = 'Viva Afrika'
        'YAMAHA' = 'Yamaha'
        'BCE' = 'BCE Brands'
        'PlusPor' = 'Plus Portal'
    }
    
    foreach ($key in $supplierMap.Keys) {
        if ($fileName -like "*$key*") {
            return $supplierMap[$key]
        }
    }
    
    return $fileName -replace '\.(xlsx|xls|xlsm|pdf|docx)$', ''
}

function Find-ColumnMapping {
    param(
        [array]$headers,
        [string]$targetType
    )
    
    $columnPatterns = @{
        'SKU' = @('SKU', 'CODE', 'ITEM CODE', 'PRODUCT CODE', 'ITEM NO', 'PART NO', 'ARTICLE')
        'MODEL' = @('MODEL', 'MODEL NO', 'MODEL NUMBER', 'PART NUMBER')
        'DESCRIPTION' = @('DESCRIPTION', 'PRODUCT', 'ITEM', 'NAME', 'PRODUCT NAME', 'ITEM DESCRIPTION')
        'BRAND' = @('BRAND', 'MAKE', 'MANUFACTURER', 'MFG')
        'COST' = @('COST', 'DEALER', 'WHOLESALE', 'TRADE', 'NET', 'PURCHASE')
        'RETAIL' = @('RETAIL', 'RRP', 'SELLING', 'LIST', 'MSRP', 'SUGGESTED')
        'STOCK' = @('STOCK', 'QTY', 'QUANTITY', 'SOH', 'ON HAND', 'AVAILABLE', 'INSTOCK')
        'PRICE' = @('PRICE', 'AMOUNT', 'VALUE', 'RATE')
        'VAT' = @('VAT', 'TAX', 'INCL', 'EXCL')
        'CATEGORY' = @('CATEGORY', 'CAT', 'GROUP', 'TYPE', 'CLASS')
        'BARCODE' = @('BARCODE', 'EAN', 'UPC', 'GTIN')
    }
    
    $matchedIndex = -1
    $patterns = $columnPatterns[$targetType]
    
    for ($i = 0; $i -lt $headers.Count; $i++) {
        $header = ($headers[$i] -as [string]).ToUpper().Trim()
        foreach ($pattern in $patterns) {
            if ($header -like "*$pattern*") {
                return $i
            }
        }
    }
    
    return -1
}

function Process-ExcelFile {
    param(
        [string]$filePath,
        [string]$supplierName
    )
    
    Write-Host "`nProcessing: $supplierName" -ForegroundColor Yellow
    Write-Host "File: $(Split-Path $filePath -Leaf)" -ForegroundColor Gray
    
    try {
        # Get all worksheet names
        $excel = Open-ExcelPackage -Path $filePath
        $worksheets = $excel.Workbook.Worksheets
        
        Write-Host "Found $($worksheets.Count) worksheet(s)" -ForegroundColor Gray
        
        foreach ($worksheet in $worksheets) {
            $sheetName = $worksheet.Name
            Write-Host "  Processing sheet: $sheetName" -ForegroundColor Cyan
            
            try {
                # Import data from worksheet
                $data = Import-Excel -Path $filePath -WorksheetName $sheetName -DataOnly
                
                if ($null -eq $data -or $data.Count -eq 0) {
                    Write-Host "    No data found in sheet" -ForegroundColor DarkGray
                    continue
                }
                
                Write-Host "    Found $($data.Count) rows" -ForegroundColor Green
                
                # Get headers from first row
                $headers = $data[0].PSObject.Properties.Name
                
                # Find column mappings
                $skuIndex = Find-ColumnMapping -headers $headers -targetType 'SKU'
                $modelIndex = Find-ColumnMapping -headers $headers -targetType 'MODEL'
                $descIndex = Find-ColumnMapping -headers $headers -targetType 'DESCRIPTION'
                $brandIndex = Find-ColumnMapping -headers $headers -targetType 'BRAND'
                $costIndex = Find-ColumnMapping -headers $headers -targetType 'COST'
                $retailIndex = Find-ColumnMapping -headers $headers -targetType 'RETAIL'
                $stockIndex = Find-ColumnMapping -headers $headers -targetType 'STOCK'
                $categoryIndex = Find-ColumnMapping -headers $headers -targetType 'CATEGORY'
                
                # Process each row
                $rowCount = 0
                foreach ($row in $data) {
                    try {
                        $rowData = [PSCustomObject]@{
                            Supplier_Name = $supplierName
                            Date_Processed = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                            Source_File = Split-Path $filePath -Leaf
                            Source_Sheet = $sheetName
                            Brand_Name = if ($brandIndex -ge 0) { $row.($headers[$brandIndex]) } else { '' }
                            SKU = if ($skuIndex -ge 0) { $row.($headers[$skuIndex]) } else { '' }
                            Model_Number = if ($modelIndex -ge 0) { $row.($headers[$modelIndex]) } else { '' }
                            Product_Description = if ($descIndex -ge 0) { $row.($headers[$descIndex]) } else { '' }
                            Cost_Price = if ($costIndex -ge 0) { $row.($headers[$costIndex]) } else { '' }
                            Retail_Price = if ($retailIndex -ge 0) { $row.($headers[$retailIndex]) } else { '' }
                            Stock_Quantity = if ($stockIndex -ge 0) { $row.($headers[$stockIndex]) } else { '' }
                            Category = if ($categoryIndex -ge 0) { $row.($headers[$categoryIndex]) } else { '' }
                            Raw_Data = ($row | ConvertTo-Json -Compress)
                        }
                        
                        # Only add rows with meaningful data
                        if ($rowData.SKU -or $rowData.Product_Description) {
                            $script:consolidatedData += $rowData
                            $rowCount++
                        }
                    }
                    catch {
                        Write-Host "    Warning: Error processing row - $($_.Exception.Message)" -ForegroundColor DarkYellow
                    }
                }
                
                Write-Host "    Extracted $rowCount valid rows" -ForegroundColor Green
                
                $script:processingLog += [PSCustomObject]@{
                    Supplier = $supplierName
                    File = Split-Path $filePath -Leaf
                    Sheet = $sheetName
                    Rows_Found = $data.Count
                    Rows_Extracted = $rowCount
                    Status = 'Success'
                    Timestamp = Get-Date
                }
            }
            catch {
                Write-Host "    Error processing sheet: $($_.Exception.Message)" -ForegroundColor Red
                $script:processingLog += [PSCustomObject]@{
                    Supplier = $supplierName
                    File = Split-Path $filePath -Leaf
                    Sheet = $sheetName
                    Rows_Found = 0
                    Rows_Extracted = 0
                    Status = "Error: $($_.Exception.Message)"
                    Timestamp = Get-Date
                }
            }
        }
        
        Close-ExcelPackage $excel -NoSave
    }
    catch {
        Write-Host "  Error opening file: $($_.Exception.Message)" -ForegroundColor Red
        $script:processingLog += [PSCustomObject]@{
            Supplier = $supplierName
            File = Split-Path $filePath -Leaf
            Sheet = 'N/A'
            Rows_Found = 0
            Rows_Extracted = 0
            Status = "File Error: $($_.Exception.Message)"
            Timestamp = Get-Date
        }
    }
}

# Get all Excel files
$files = Get-ChildItem -Path $SourcePath -Filter *.xlsx -File
$files += Get-ChildItem -Path $SourcePath -Filter *.xls -File
$files += Get-ChildItem -Path $SourcePath -Filter *.xlsm -File

Write-Host "Found $($files.Count) Excel files to process`n" -ForegroundColor Green
Write-Host "Starting systematic processing..." -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Gray

# Process each file
$fileNumber = 1
foreach ($file in $files) {
    Write-Host "`n[$fileNumber/$($files.Count)] " -NoNewline -ForegroundColor Magenta
    $supplierName = Extract-SupplierName -fileName $file.Name
    Process-ExcelFile -filePath $file.FullName -supplierName $supplierName
    $fileNumber++
}

# Export consolidated data
Write-Host "`n" -NoNewline
Write-Host ("=" * 80) -ForegroundColor Gray
Write-Host "Processing complete!" -ForegroundColor Green
Write-Host "Total rows extracted: $($consolidatedData.Count)" -ForegroundColor Cyan

if ($consolidatedData.Count -gt 0) {
    Write-Host "`nExporting consolidated data..." -ForegroundColor Yellow
    
    # Create Excel package with multiple sheets
    $consolidatedData | Export-Excel -Path $OutputPath -WorksheetName "All_Products" -AutoSize -AutoFilter -FreezeTopRow -BoldTopRow
    $processingLog | Export-Excel -Path $OutputPath -WorksheetName "Processing_Log" -AutoSize -AutoFilter -FreezeTopRow -BoldTopRow -Show
    
    # Group by supplier and export
    $supplierGroups = $consolidatedData | Group-Object -Property Supplier_Name
    foreach ($group in $supplierGroups) {
        $safeName = $group.Name -replace '[\\/:*?"<>|]', '_'
        if ($safeName.Length -gt 31) { $safeName = $safeName.Substring(0, 31) }
        $group.Group | Export-Excel -Path $OutputPath -WorksheetName $safeName -AutoSize -AutoFilter -FreezeTopRow -BoldTopRow
    }
    
    Write-Host "Data exported to: $OutputPath" -ForegroundColor Green
    Write-Host "`nSummary by Supplier:" -ForegroundColor Cyan
    $supplierGroups | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) products" -ForegroundColor Gray
    }
}
else {
    Write-Host "`nWarning: No data was extracted!" -ForegroundColor Red
}

Write-Host "`n" -NoNewline
Write-Host ("=" * 80) -ForegroundColor Gray
Write-Host "Process completed at $(Get-Date)" -ForegroundColor Cyan