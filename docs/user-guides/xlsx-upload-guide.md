# XLSX Upload Guide

MantisNXT provides powerful Excel upload functionality for bulk data imports. This guide covers everything you need to know about uploading and processing XLSX files.

## Overview

The XLSX upload feature allows you to:
- **Bulk import suppliers** from existing databases
- **Upload inventory data** from spreadsheets
- **Import purchase order information** in batches
- **Update customer records** efficiently
- **Process financial data** with validation

## Supported Import Types

### 1. Supplier Data
Import supplier information including company details, contact information, and compliance data.

### 2. Inventory Items
Upload product catalogs, stock levels, and pricing information.

### 3. Purchase Orders
Bulk create purchase orders with line items and supplier references.

### 4. Customer Information
Import customer databases with contact and billing details.

### 5. Financial Records
Upload invoices, payments, and budget allocations.

## Getting Started

### Step 1: Download Template

1. Navigate to the section you want to import (e.g., Suppliers)
2. Click the **"Import"** button
3. Select **"Download Template"**
4. Save the Excel template to your computer

### Step 2: Prepare Your Data

1. Open the downloaded template in Excel
2. Fill in your data following the column headers
3. Ensure all required fields are completed
4. Save the file in XLSX format

### Step 3: Upload and Process

1. Return to MantisNXT
2. Click **"Import"** → **"Upload File"**
3. Select your completed XLSX file
4. Review the validation results
5. Complete the import process

## Template Formats

### Supplier Import Template

**Required Columns:**
- `Name` - Company name
- `Email` - Primary contact email
- `Phone` - Contact phone number
- `Company Registration` - SA registration (yyyy/xxxxxx/xx)
- `VAT Number` - SA VAT number (4xxxxxxxxx)
- `Address` - Street address
- `City` - City name
- `Province` - South African province
- `Postal Code` - Postal code

**Optional Columns:**
- `BEE Level` - BEE level (1-8)
- `BEE Certificate Expiry` - Certificate expiry date
- `Payment Terms` - Payment terms in days
- `Credit Limit` - Credit limit in ZAR
- `Category` - Supplier category
- `Notes` - Additional notes

**Example Data:**
```
Name: TechCorp Solutions (Pty) Ltd
Email: info@techcorp.co.za
Phone: +27 11 123 4567
Company Registration: 2019/123456/07
VAT Number: 4123456789
Address: 123 Business Park Drive
City: Johannesburg
Province: Gauteng
Postal Code: 2196
BEE Level: 2
Payment Terms: 30
Credit Limit: 5000000
Category: Technology
```

### Inventory Import Template

**Required Columns:**
- `SKU` - Stock keeping unit (unique)
- `Name` - Product name
- `Description` - Product description
- `Category` - Product category
- `Unit Price` - Price per unit (ZAR)
- `Currency` - Currency code (ZAR)
- `Stock Quantity` - Current stock level
- `Reorder Level` - Minimum stock level
- `Supplier Name` - Primary supplier

**Optional Columns:**
- `Brand` - Product brand
- `Model` - Product model
- `Weight` - Product weight (kg)
- `Dimensions` - Product dimensions
- `Lead Time` - Supplier lead time (days)
- `Location` - Storage location
- `Notes` - Additional notes

**Example Data:**
```
SKU: TECH-001
Name: Dell XPS Laptop
Description: High-performance business laptop
Category: Technology
Unit Price: 25000.00
Currency: ZAR
Stock Quantity: 15
Reorder Level: 5
Supplier Name: TechCorp Solutions
```

### Purchase Order Import Template

**Required Columns:**
- `PO Number` - Purchase order number
- `Supplier Name` - Supplier company name
- `Item SKU` - Product SKU
- `Item Name` - Product name
- `Quantity` - Order quantity
- `Unit Price` - Price per unit (ZAR)
- `Currency` - Currency code (ZAR)
- `Delivery Date` - Expected delivery date

**Optional Columns:**
- `Notes` - Order notes
- `Department` - Requesting department
- `Budget Code` - Budget allocation code
- `Priority` - Order priority (High/Medium/Low)
- `Delivery Address` - Specific delivery location

## Data Validation Rules

### General Rules
- **Required fields** must be completed
- **Data formats** must match expected types
- **Unique constraints** must be respected
- **Referential integrity** must be maintained

### South African Specific Validation

#### Company Registration Numbers
- Format: `yyyy/xxxxxx/xx`
- Example: `2019/123456/07`
- Validation: Year must be 1900-current year

#### VAT Numbers
- Format: `4xxxxxxxxx` (10 digits starting with 4)
- Example: `4123456789`
- Validation: Checksum algorithm validation

#### Phone Numbers
- Format: `+27 xx xxx xxxx` or `0xx xxx xxxx`
- Example: `+27 11 123 4567`
- Validation: South African number format

#### Provinces
Valid provinces:
- Eastern Cape
- Free State
- Gauteng
- KwaZulu-Natal
- Limpopo
- Mpumalanga
- Northern Cape
- North West
- Western Cape

#### BEE Levels
- Range: 1-8 (1 being the highest BEE status)
- Validation: Must be integer within range

### Currency and Financial Validation

#### ZAR Amounts
- Format: Positive decimal numbers
- Example: `125000.00`, `1250.50`
- Maximum: R 999,999,999.99

#### VAT Calculations
- Standard rate: 15%
- Zero-rated items: 0%
- Exempt items: Not applicable

## Upload Process

### Step-by-Step Upload

1. **Select File**
   ```
   Click "Choose File" → Select your XLSX file → Click "Open"
   ```

2. **Initial Validation**
   - File format check (must be XLSX)
   - File size check (max 10MB)
   - Column header validation
   - Basic data type validation

3. **Data Preview**
   ```
   Review first 5 rows of your data
   Verify column mapping is correct
   Check for obvious data issues
   ```

4. **Processing Options**
   - **Validate Only**: Check data without importing
   - **Skip Duplicates**: Ignore duplicate records
   - **Update Existing**: Update existing records
   - **Create New Only**: Only create new records

5. **Final Processing**
   - Complete data validation
   - Import processing
   - Results summary

### Validation Results

#### Success Response
```
✅ Import Successful
- Total rows processed: 150
- Successfully imported: 142
- Duplicates skipped: 5
- Errors: 3
```

#### Error Response
```
❌ Import Failed
- Row 15: Invalid VAT number format
- Row 28: Missing required field 'Email'
- Row 45: Invalid province name
```

## Common Issues and Solutions

### Issue: Invalid File Format
**Problem**: "File must be in XLSX format"
**Solution**:
- Save file as Excel Workbook (*.xlsx)
- Avoid older .xls format
- Don't use CSV files for this upload method

### Issue: Missing Required Columns
**Problem**: "Required column 'Name' not found"
**Solution**:
- Download fresh template
- Ensure column headers match exactly
- Don't modify header row

### Issue: Duplicate Data
**Problem**: "Duplicate supplier with email already exists"
**Solution**:
- Enable "Skip Duplicates" option
- Or enable "Update Existing" to update records
- Remove duplicates from your Excel file

### Issue: Invalid VAT Numbers
**Problem**: "VAT number format is invalid"
**Solution**:
- Use format: 4xxxxxxxxx (10 digits)
- Ensure first digit is 4
- Leave blank if supplier is not VAT registered

### Issue: Date Format Errors
**Problem**: "Invalid date format in BEE Certificate Expiry"
**Solution**:
- Use format: YYYY-MM-DD or DD/MM/YYYY
- Example: 2025-12-31 or 31/12/2025
- Ensure dates are in Excel date format

### Issue: Province Not Found
**Problem**: "Invalid province name"
**Solution**:
- Use exact province names (see list above)
- Check spelling and capitalization
- Use full province names, not abbreviations

## Advanced Features

### Bulk Update Mode

Enable bulk updates to modify existing records:

1. Include ID column in your Excel file
2. Enable "Update Existing" option
3. Only modified fields will be updated
4. Existing data preserved for blank cells

### Custom Field Mapping

Map your Excel columns to system fields:

1. Upload file with different column headers
2. Use "Map Fields" feature
3. Match your columns to system fields
4. Save mapping for future uploads

### Batch Processing

For large files (>5,000 rows):

1. Split file into smaller batches
2. Upload each batch separately
3. Monitor processing progress
4. Combine results after completion

### Data Transformation

Apply transformations during upload:

- **Text Case**: Convert to Title Case, UPPER, or lower
- **Phone Format**: Standardize phone number format
- **Currency**: Convert amounts to ZAR
- **Dates**: Standardize date formats

## Best Practices

### Data Preparation
1. **Clean your data** before upload
2. **Remove empty rows** at the bottom
3. **Standardize formats** across columns
4. **Validate required fields** manually first

### File Management
1. **Keep original files** as backup
2. **Use descriptive filenames** (suppliers-2024-09-22.xlsx)
3. **Version control** for multiple uploads
4. **Test with small files** first

### Error Handling
1. **Start with validation mode** to check for errors
2. **Fix errors systematically** one by one
3. **Re-upload cleaned data** after fixes
4. **Keep error logs** for reference

### Performance Tips
1. **Upload during off-peak hours** for better performance
2. **Split large files** into 1,000-2,000 row chunks
3. **Use batch processing** for very large datasets
4. **Monitor system resources** during upload

## Monitoring Import Progress

### Real-time Status
```
📊 Processing Upload...
Progress: 75% (750 of 1,000 rows)
Estimated time remaining: 2 minutes
```

### Import History
View your upload history:
1. Go to **Admin** → **Data Imports**
2. See list of all imports with status
3. Download error logs for failed imports
4. Re-process failed imports after fixes

### Notifications
Receive notifications when:
- Upload completes successfully
- Errors occur during processing
- Large imports finish processing
- System maintenance affects uploads

## Troubleshooting

### File Won't Upload
1. Check file size (max 10MB)
2. Verify XLSX format
3. Ensure stable internet connection
4. Try different browser

### Slow Processing
1. Reduce file size
2. Upload during off-peak hours
3. Check system status page
4. Contact support if persistent

### Data Not Appearing
1. Check import status
2. Verify user permissions
3. Refresh browser page
4. Check filters on data views

### Validation Errors
1. Download error log
2. Fix errors in original file
3. Re-upload corrected file
4. Use validation mode first

## Getting Help

### Self-Service
- **Error Logs**: Download detailed error information
- **Templates**: Always use latest template versions
- **Documentation**: Refer to field-specific help
- **Validation**: Use validation mode to test

### Support Channels
- **In-app Help**: Click help icon during upload
- **Email Support**: support@mantisnxt.com
- **Live Chat**: Available during business hours
- **Training Sessions**: Request team training

Ready to start uploading? Download your template and begin importing your data into MantisNXT!