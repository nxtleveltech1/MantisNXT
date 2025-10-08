#!/usr/bin/env python3
"""Complete missing supplier data from row 22084 onwards."""

import sys, os
import pandas as pd
import numpy as np
import re

# Add user packages
import site
sys.path.insert(0, site.getusersitepackages())

try:
    import openpyxl
except:
    os.system(f"{sys.executable} -m pip install --user openpyxl pandas --quiet")
    import openpyxl

MASTER_COLUMNS = [
    'Supplier Name ', 'Supplier Code', 'Produt Category', 'BRAND', 'Brand Sub Tag',
    'SKU / MODEL ', 'PRODUCT DESCRIPTION', 'SUPPLIER SOH', 'COST  EX VAT',
    'QTY ON ORDER', 'NEXT SHIPMENT', 'Tags', 'LINKS'
]

def extract_brand_from_description(desc):
    """Extract brand name from product description."""
    if pd.isna(desc):
        return None

    desc_str = str(desc).strip()

    # Common brand patterns
    brand_patterns = [
        r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+',  # Capitalized words at start
        r'^(AIDA|Aida)\s+Imaging',  # Aida Imaging specific
        r'^([A-Z]+)\s+',  # All caps brand
    ]

    for pattern in brand_patterns:
        match = re.match(pattern, desc_str)
        if match:
            brand = match.group(1)
            if brand.upper() == 'AIDA':
                return 'Aida Imaging'
            return brand

    return None

def identify_supplier_from_context(df, start_idx):
    """
    Identify supplier by looking at rows before the missing data
    and analyzing SKU/description patterns.
    """

    print("\n" + "="*80)
    print("IDENTIFYING SUPPLIER FROM CONTEXT")
    print("="*80 + "\n")

    # Look at 100 rows before the missing data
    context_start = max(0, start_idx - 100)
    context_df = df.iloc[context_start:start_idx]

    # Find last non-null supplier
    last_suppliers = context_df[context_df['Supplier Name '].notna()]['Supplier Name '].tail(10)

    print("Last 10 suppliers before missing data:")
    for idx, supp in last_suppliers.items():
        print(f"  Row {idx+2}: {supp}")

    # Analyze the missing data rows
    missing_df = df.iloc[start_idx:]

    # Extract brands from descriptions
    print("\n" + "="*80)
    print("ANALYZING PRODUCT DESCRIPTIONS")
    print("="*80 + "\n")

    sample_descriptions = missing_df['PRODUCT DESCRIPTION'].dropna().head(20)

    brand_counts = {}
    for desc in sample_descriptions:
        brand = extract_brand_from_description(desc)
        if brand:
            brand_counts[brand] = brand_counts.get(brand, 0) + 1

    print("Detected brands in descriptions:")
    for brand, count in sorted(brand_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {brand}: {count} occurrences")

    # Check SKU patterns
    print("\n" + "="*80)
    print("ANALYZING SKU PATTERNS")
    print("="*80 + "\n")

    sample_skus = missing_df['SKU / MODEL '].dropna().head(20)

    sku_prefixes = {}
    for sku in sample_skus:
        sku_str = str(sku)
        # Extract prefix (letters before dash or first 3 chars)
        if '-' in sku_str:
            prefix = sku_str.split('-')[0]
        else:
            prefix = sku_str[:3]

        if prefix:
            sku_prefixes[prefix] = sku_prefixes.get(prefix, 0) + 1

    print("SKU prefix patterns:")
    for prefix, count in sorted(sku_prefixes.items(), key=lambda x: x[1], reverse=True):
        print(f"  {prefix}: {count} occurrences")

    # Make determination
    print("\n" + "="*80)
    print("SUPPLIER DETERMINATION")
    print("="*80 + "\n")

    # Check if Pro Audio Platinum based on patterns
    if 'Aida Imaging' in brand_counts or 'AID' in sku_prefixes:
        print("✅ Detected: Pro Audio Platinum (Aida Imaging products)")
        print("   Reason: 'Aida Imaging' brand in descriptions + AID prefix in SKUs")
        return 'Pro Audio Platinum', 'PRO_AUDIO'

    # Default to last known supplier
    if len(last_suppliers) > 0:
        last_supplier = last_suppliers.iloc[-1]
        print(f"⚠️  Defaulting to last known supplier: {last_supplier}")
        return last_supplier, None

    return None, None

def complete_missing_data(df, start_idx, supplier_name, supplier_code):
    """Fill in missing supplier data."""

    print("\n" + "="*80)
    print("COMPLETING MISSING DATA")
    print("="*80 + "\n")

    missing_count = len(df) - start_idx

    print(f"Rows to complete: {missing_count:,}")
    print(f"Supplier Name: {supplier_name}")
    print(f"Supplier Code: {supplier_code}\n")

    # Fill Supplier Name and Code
    df.loc[start_idx:, 'Supplier Name '] = df.loc[start_idx:, 'Supplier Name '].fillna(supplier_name)
    df.loc[start_idx:, 'Supplier Code'] = df.loc[start_idx:, 'Supplier Code'].fillna(supplier_code)

    # Extract and fill BRAND from descriptions
    print("Extracting brands from descriptions...")

    brands_extracted = 0
    for idx in range(start_idx, len(df)):
        if pd.isna(df.at[idx, 'BRAND']):
            desc = df.at[idx, 'PRODUCT DESCRIPTION']
            brand = extract_brand_from_description(desc)

            if brand:
                df.at[idx, 'BRAND'] = brand
                brands_extracted += 1

    print(f"✅ Filled Supplier Name: {missing_count:,} rows")
    print(f"✅ Filled Supplier Code: {missing_count:,} rows")
    print(f"✅ Extracted BRAND: {brands_extracted:,} rows\n")

    return df

def main():
    file_path = '/mnt/k/00Project/MantisNXT/database/Uploads/FINAL_MASTER_CONSOLIDATED.xlsx'

    print("\n" + "="*80)
    print("COMPLETING MISSING SUPPLIER DATA FROM ROW 22084")
    print("="*80)

    # Read file
    print("\n📂 Reading file...")
    df = pd.read_excel(file_path, sheet_name='MASTER')

    print(f"✅ Loaded {len(df):,} rows\n")

    # Identify where missing data starts
    start_idx = 22083  # Row 22084 in Excel (0-indexed)

    # Identify supplier
    supplier_name, supplier_code = identify_supplier_from_context(df, start_idx)

    if not supplier_name:
        print("❌ Could not identify supplier. Exiting.")
        return 1

    if not supplier_code:
        # Generate supplier code from name
        supplier_code = supplier_name.upper().replace(' ', '_')[:12]

    # Complete missing data
    df_completed = complete_missing_data(df, start_idx, supplier_name, supplier_code)

    # Validate completion
    print("="*80)
    print("VALIDATION")
    print("="*80 + "\n")

    df_target = df_completed.iloc[start_idx:]

    for col in ['Supplier Name ', 'Supplier Code', 'BRAND']:
        missing = df_target[col].isna().sum()
        pct_complete = ((len(df_target) - missing) / len(df_target)) * 100

        status = "✅" if missing == 0 else "⚠️ " if pct_complete > 80 else "❌"
        print(f"{status} {col:20s}: {pct_complete:6.1f}% complete ({missing:,} missing)")

    # Overall validation
    print("\n" + "="*80)
    print("OVERALL FILE QUALITY")
    print("="*80 + "\n")

    for col in ['Supplier Name ', 'Supplier Code', 'BRAND', 'SKU / MODEL ', 'PRODUCT DESCRIPTION']:
        missing = df_completed[col].isna().sum()
        pct_complete = ((len(df_completed) - missing) / len(df_completed)) * 100

        status = "✅" if pct_complete >= 95 else "⚠️ " if pct_complete >= 80 else "❌"
        print(f"{status} {col:25s}: {pct_complete:6.1f}% complete")

    # Save completed file
    output_path = '/mnt/k/00Project/MantisNXT/database/Uploads/FINAL_MASTER_CONSOLIDATED_COMPLETE.xlsx'

    print("\n" + "="*80)
    print("SAVING COMPLETED FILE")
    print("="*80 + "\n")

    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df_completed.to_excel(writer, sheet_name='MASTER', index=False)

        # Summary
        summary = pd.DataFrame({
            'Metric': [
                'Total Rows',
                'Total Suppliers',
                'Supplier Name Completeness',
                'Brand Completeness',
                'SKU Completeness',
                'Updated'
            ],
            'Value': [
                len(df_completed),
                df_completed['Supplier Name '].nunique(),
                f"{((len(df_completed) - df_completed['Supplier Name '].isna().sum()) / len(df_completed) * 100):.1f}%",
                f"{((len(df_completed) - df_completed['BRAND'].isna().sum()) / len(df_completed) * 100):.1f}%",
                f"{((len(df_completed) - df_completed['SKU / MODEL '].isna().sum()) / len(df_completed) * 100):.1f}%",
                pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
            ]
        })
        summary.to_excel(writer, sheet_name='Summary', index=False)

        # Supplier counts
        counts = df_completed['Supplier Name '].value_counts().reset_index()
        counts.columns = ['Supplier', 'Row Count']
        counts.to_excel(writer, sheet_name='Supplier_Counts', index=False)

    print(f"✅ Saved: {output_path}\n")
    print(f"   Total Rows: {len(df_completed):,}")
    print(f"   Suppliers: {df_completed['Supplier Name '].nunique()}")
    print(f"   Quality Score: {((len(df_completed) - df_completed['Supplier Name '].isna().sum()) / len(df_completed) * 100):.1f}%\n")

    print("="*80)
    print("✅ COMPLETION SUCCESSFUL")
    print("="*80 + "\n")

    return 0

if __name__ == '__main__':
    sys.exit(main())
