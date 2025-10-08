#!/usr/bin/env python3
"""Aggregate ALL supplier data from FIXED batches to single MASTER file."""

import sys, os
import pandas as pd
import openpyxl
from datetime import datetime

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

def main():
    base = '/mnt/k/00Project/MantisNXT/database/Uploads'
    batches = [
        f'{base}/Consolidated_Supplier_Data_BATCH1_FIXED.xlsx',
        f'{base}/Consolidated_Supplier_Data_Batch2_FIXED.xlsx',
        f'{base}/Consolidated_Batch3_Final_FIXED.xlsx'
    ]

    print("\n" + "="*80)
    print("AGGREGATING ALL SUPPLIERS TO MASTER")
    print("="*80 + "\n")

    all_data = []
    skip = ['MASTER', 'All_Products', 'Processing_Log']

    for batch in batches:
        if not os.path.exists(batch):
            print(f"⚠️  Not found: {batch}")
            continue

        print(f"📂 {os.path.basename(batch)}")
        wb = openpyxl.load_workbook(batch, read_only=True, data_only=True)

        for sheet in wb.sheetnames:
            if sheet in skip:
                continue

            df = pd.read_excel(batch, sheet_name=sheet)

            if list(df.columns) == MASTER_COLUMNS:
                print(f"  ✅ {sheet}: {len(df)} rows")
                all_data.append(df)
            else:
                print(f"  ❌ {sheet}: Column mismatch")

        wb.close()

    print(f"\n📊 Total sheets: {len(all_data)}")

    if not all_data:
        print("❌ No data loaded")
        return 1

    # Combine
    df_all = pd.concat(all_data, ignore_index=True)
    print(f"📊 Total rows before dedup: {len(df_all):,}")

    # Deduplicate
    df_clean = df_all.drop_duplicates(subset=['Supplier Name ', 'SKU / MODEL '], keep='first')
    print(f"📊 Total rows after dedup: {len(df_clean):,}")
    print(f"📊 Removed duplicates: {len(df_all) - len(df_clean):,}")

    # Sort
    df_final = df_clean.sort_values(['Supplier Name ', 'SKU / MODEL '])

    # Quality
    print("\n" + "="*80)
    print("QUALITY METRICS")
    print("="*80)
    for col in ['Supplier Name ', 'SKU / MODEL ', 'PRODUCT DESCRIPTION', 'COST  EX VAT']:
        pct = df_final[col].notna().sum() / len(df_final) * 100
        print(f"{col:25s}: {pct:6.2f}%")

    # Write
    output = f'{base}/FINAL_MASTER_CONSOLIDATED.xlsx'
    print(f"\n📝 Writing to: {output}")

    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_final.to_excel(writer, sheet_name='MASTER', index=False)

        # Summary
        summary = pd.DataFrame({
            'Metric': ['Total Rows', 'Total Suppliers', 'Created'],
            'Value': [len(df_final), df_final['Supplier Name '].nunique(), datetime.now().strftime("%Y-%m-%d %H:%M:%S")]
        })
        summary.to_excel(writer, sheet_name='Summary', index=False)

        # Per-supplier counts
        counts = df_final['Supplier Name '].value_counts().reset_index()
        counts.columns = ['Supplier', 'Row Count']
        counts.to_excel(writer, sheet_name='Supplier_Counts', index=False)

    print(f"\n✅ SUCCESS!")
    print(f"   File: {output}")
    print(f"   Rows: {len(df_final):,}")
    print(f"   Suppliers: {df_final['Supplier Name '].nunique()}\n")

    return 0

if __name__ == '__main__':
    sys.exit(main())
