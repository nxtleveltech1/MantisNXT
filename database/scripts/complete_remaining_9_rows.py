#!/usr/bin/env python3
"""Complete the remaining 9 rows with missing supplier data."""

import sys, os
import pandas as pd

# Add user packages
import site
sys.path.insert(0, site.getusersitepackages())

def complete_remaining_rows():
    file_path = '/mnt/k/00Project/MantisNXT/database/Uploads/FINAL_MASTER_CONSOLIDATED_COMPLETE.xlsx'

    print("\n" + "="*80)
    print("FINDING AND COMPLETING REMAINING MISSING ROWS")
    print("="*80 + "\n")

    df = pd.read_excel(file_path, sheet_name='MASTER')

    # Find rows with missing Supplier Name
    missing_rows = df[df['Supplier Name '].isna()]

    print(f"Total rows with missing Supplier Name: {len(missing_rows)}\n")

    if len(missing_rows) == 0:
        print("✅ No missing rows found!")
        return df

    print("="*80)
    print("ANALYZING MISSING ROWS")
    print("="*80 + "\n")

    for idx, row in missing_rows.iterrows():
        actual_row = idx + 2
        print(f"Row {actual_row}:")
        print(f"  SKU: {row['SKU / MODEL ']}")
        print(f"  Description: {str(row['PRODUCT DESCRIPTION'])[:60]}...")
        print(f"  Cost: {row['COST  EX VAT']}")

        # Look at surrounding rows for context
        if idx > 0:
            prev_row = df.iloc[idx-1]
            print(f"  Previous Row Supplier: {prev_row['Supplier Name ']}")

        if idx < len(df) - 1:
            next_row = df.iloc[idx+1]
            print(f"  Next Row Supplier: {next_row['Supplier Name ']}")

        print()

    # Strategy: Fill with supplier from nearest non-null row
    print("="*80)
    print("COMPLETING MISSING ROWS")
    print("="*80 + "\n")

    for idx, row in missing_rows.iterrows():
        # Look backward for nearest supplier
        supplier_name = None
        supplier_code = None

        # Search backward
        for i in range(idx-1, max(-1, idx-100), -1):
            if pd.notna(df.at[i, 'Supplier Name ']):
                supplier_name = df.at[i, 'Supplier Name ']
                supplier_code = df.at[i, 'Supplier Code']
                break

        # If not found backward, search forward
        if not supplier_name:
            for i in range(idx+1, min(len(df), idx+100)):
                if pd.notna(df.at[i, 'Supplier Name ']):
                    supplier_name = df.at[i, 'Supplier Name ']
                    supplier_code = df.at[i, 'Supplier Code']
                    break

        if supplier_name:
            df.at[idx, 'Supplier Name '] = supplier_name
            df.at[idx, 'Supplier Code'] = supplier_code
            print(f"✅ Row {idx+2}: Filled with '{supplier_name}' / '{supplier_code}'")
        else:
            print(f"⚠️  Row {idx+2}: Could not find nearby supplier")

    # Validate
    remaining_missing = df['Supplier Name '].isna().sum()

    print("\n" + "="*80)
    print("VALIDATION")
    print("="*80 + "\n")

    if remaining_missing == 0:
        print("✅ ALL rows now have Supplier Name and Code!")
    else:
        print(f"⚠️  Still {remaining_missing} rows missing")

    # Save
    output_path = '/mnt/k/00Project/MantisNXT/database/Uploads/FINAL_MASTER_CONSOLIDATED_COMPLETE.xlsx'

    print("\n" + "="*80)
    print("SAVING UPDATED FILE")
    print("="*80 + "\n")

    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='MASTER', index=False)

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
                len(df),
                df['Supplier Name '].nunique(),
                f"{((len(df) - df['Supplier Name '].isna().sum()) / len(df) * 100):.2f}%",
                f"{((len(df) - df['BRAND'].isna().sum()) / len(df) * 100):.2f}%",
                f"{((len(df) - df['SKU / MODEL '].isna().sum()) / len(df) * 100):.2f}%",
                pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
            ]
        })
        summary.to_excel(writer, sheet_name='Summary', index=False)

        # Supplier counts
        counts = df['Supplier Name '].value_counts().reset_index()
        counts.columns = ['Supplier', 'Row Count']
        counts.to_excel(writer, sheet_name='Supplier_Counts', index=False)

    print(f"✅ Saved: {output_path}")
    print(f"   Supplier Name: {df['Supplier Name '].notna().sum():,} / {len(df):,} ({(df['Supplier Name '].notna().sum() / len(df) * 100):.2f}%)")
    print(f"   Supplier Code: {df['Supplier Code'].notna().sum():,} / {len(df):,} ({(df['Supplier Code'].notna().sum() / len(df) * 100):.2f}%)\n")

    return df

if __name__ == '__main__':
    df = complete_remaining_rows()
