#!/usr/bin/env python3
"""
Comprehensive analysis of all supplier price list files with smart header detection.
"""

import os
import pandas as pd
import json
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

def find_header_row(df, max_check_rows=5):
    """Find the row that contains the actual column headers."""
    for i in range(min(max_check_rows, len(df))):
        row_values = df.iloc[i].astype(str).str.lower()
        # Look for common price list headers
        common_headers = ['sku', 'code', 'item', 'description', 'price', 'cost', 'brand', 'model', 'stock', 'qty']
        header_matches = sum(1 for val in row_values if any(header in str(val).lower() for header in common_headers))

        if header_matches >= 2:  # At least 2 common headers found
            return i
    return 0  # Default to first row

def analyze_excel_file_smart(file_path):
    """Analyze Excel file with smart header detection."""
    try:
        # Read a larger sample to find headers
        df_sample = pd.read_excel(file_path, nrows=10, header=None)

        # Find header row
        header_row = find_header_row(df_sample)

        # Read again with correct header
        df = pd.read_excel(file_path, header=header_row, nrows=15)

        # Clean column names
        columns = []
        for col in df.columns:
            col_str = str(col).strip()
            if col_str.startswith('Unnamed:') and header_row > 0:
                # Try to get actual header from the data
                try:
                    actual_header = df_sample.iloc[header_row, df.columns.get_loc(col)]
                    if pd.notna(actual_header) and str(actual_header).strip():
                        columns.append(str(actual_header).strip())
                    else:
                        columns.append(col_str)
                except:
                    columns.append(col_str)
            else:
                columns.append(col_str)

        # Get sample data (skip empty rows)
        sample_data = []
        for _, row in df.head(3).iterrows():
            row_dict = {}
            for i, col in enumerate(columns):
                if i < len(row):
                    value = row.iloc[i]
                    row_dict[col] = str(value) if pd.notna(value) else ""
            if any(row_dict.values()):  # Skip completely empty rows
                sample_data.append(row_dict)

        # Identify key columns
        key_columns = identify_key_columns(columns)

        return {
            'file_type': 'Excel',
            'columns': columns,
            'total_columns': len(columns),
            'sample_data': sample_data[:2],
            'file_size_mb': round(os.path.getsize(file_path) / (1024*1024), 2),
            'header_row': header_row,
            'key_columns': key_columns
        }
    except Exception as e:
        return {
            'file_type': 'Excel',
            'error': str(e),
            'file_size_mb': round(os.path.getsize(file_path) / (1024*1024), 2)
        }

def identify_key_columns(columns):
    """Identify key columns based on common patterns."""
    key_columns = {}

    for i, col in enumerate(columns):
        col_lower = str(col).lower().strip()

        # SKU/Item Number patterns
        if any(pattern in col_lower for pattern in ['sku', 'item no', 'item_no', 'item number', 'product code', 'code']):
            key_columns['sku'] = col

        # Description patterns
        elif any(pattern in col_lower for pattern in ['description', 'product name', 'item description', 'name', 'model']):
            key_columns['description'] = col

        # Price patterns
        elif any(pattern in col_lower for pattern in ['price', 'cost', 'retail', 'dealer']):
            if 'dealer' in col_lower or 'cost' in col_lower:
                key_columns['dealer_price'] = col
            elif 'retail' in col_lower:
                key_columns['retail_price'] = col
            else:
                key_columns['price'] = col

        # Stock/Quantity patterns
        elif any(pattern in col_lower for pattern in ['stock', 'qty', 'quantity', 'on hand']):
            key_columns['stock'] = col

        # Brand patterns
        elif any(pattern in col_lower for pattern in ['brand', 'manufacturer', 'make']):
            key_columns['brand'] = col

        # Category patterns
        elif any(pattern in col_lower for pattern in ['category', 'type', 'class', 'group']):
            key_columns['category'] = col

    return key_columns

def analyze_all_files():
    """Analyze all files in the directory."""
    directory_path = r"K:\00Project\MantisNXT\database\Uploads\drive-download-20250904T012253Z-1-001"
    directory = Path(directory_path)

    if not directory.exists():
        return {'error': f'Directory not found: {directory_path}'}

    results = {}
    file_types = {'Excel': 0, 'PDF': 0, 'CSV': 0, 'Word': 0, 'Other': 0}

    print("Comprehensive Price List Analysis")
    print("=" * 50)

    for file_path in directory.iterdir():
        if file_path.is_file():
            file_name = file_path.name
            file_ext = file_path.suffix.lower()

            print(f"Analyzing: {file_name}")

            if file_ext in ['.xlsx', '.xls', '.xlsm']:
                results[file_name] = analyze_excel_file_smart(str(file_path))
                file_types['Excel'] += 1
            elif file_ext == '.pdf':
                results[file_name] = {
                    'file_type': 'PDF',
                    'file_size_mb': round(file_path.stat().st_size / (1024*1024), 2),
                    'note': 'Requires manual extraction - contains scanned/formatted price lists'
                }
                file_types['PDF'] += 1
            elif file_ext == '.csv':
                try:
                    df = pd.read_csv(str(file_path), nrows=10)
                    results[file_name] = {
                        'file_type': 'CSV',
                        'columns': list(df.columns),
                        'total_columns': len(df.columns),
                        'sample_data': df.head(2).fillna('').astype(str).to_dict('records')
                    }
                except Exception as e:
                    results[file_name] = {'file_type': 'CSV', 'error': str(e)}
                file_types['CSV'] += 1
            elif file_ext == '.docx':
                results[file_name] = {
                    'file_type': 'Word Document',
                    'note': 'Likely contains login credentials or documentation'
                }
                file_types['Word'] += 1
            else:
                results[file_name] = {
                    'file_type': 'Other',
                    'extension': file_ext,
                    'file_size_mb': round(file_path.stat().st_size / (1024*1024), 2)
                }
                file_types['Other'] += 1

    return results, file_types

def generate_comprehensive_report():
    """Generate comprehensive analysis report."""

    results, file_types = analyze_all_files()

    # Analyze patterns across all files
    all_key_columns = {}
    column_frequency = {}
    successful_files = []

    for file_name, file_info in results.items():
        if file_info.get('file_type') == 'Excel' and 'error' not in file_info:
            successful_files.append(file_name)

            # Collect key columns
            key_cols = file_info.get('key_columns', {})
            for key, col in key_cols.items():
                if key not in all_key_columns:
                    all_key_columns[key] = []
                all_key_columns[key].append({'file': file_name, 'column': col})

            # Count all columns
            for col in file_info.get('columns', []):
                col_normalized = str(col).lower().strip()
                column_frequency[col_normalized] = column_frequency.get(col_normalized, 0) + 1

    # Generate report
    report = {
        'summary': {
            'total_files': len(results),
            'file_types': file_types,
            'successful_excel_analyses': len(successful_files),
            'failed_analyses': len([f for f in results.values() if 'error' in f])
        },
        'key_field_mapping': all_key_columns,
        'most_common_columns': dict(sorted(column_frequency.items(), key=lambda x: x[1], reverse=True)[:20]),
        'detailed_results': results
    }

    # Save report
    output_file = r"K:\00Project\MantisNXT\claudedocs\comprehensive_pricelist_analysis.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    # Print summary
    print(f"\nCOMPREHENSIVE ANALYSIS RESULTS")
    print(f"Total files: {report['summary']['total_files']}")
    print(f"File types: {report['summary']['file_types']}")
    print(f"Successfully analyzed Excel files: {report['summary']['successful_excel_analyses']}")

    print(f"\nKey Fields Found Across Files:")
    for field_type, occurrences in all_key_columns.items():
        print(f"  {field_type}: {len(occurrences)} files")
        for occ in occurrences[:3]:  # Show first 3 examples
            print(f"    - {occ['file']}: '{occ['column']}'")

    print(f"\nReport saved to: {output_file}")

    return report

if __name__ == "__main__":
    report = generate_comprehensive_report()