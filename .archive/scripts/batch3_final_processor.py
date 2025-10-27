#!/usr/bin/env python3
"""
DATA ORACLE AGENT ALPHA-3: Final Batch 3 Processor
Comprehensive processing of all 7 supplier files with proper data extraction
"""

import pandas as pd
import openpyxl
from pathlib import Path
import re
import warnings
warnings.filterwarnings('ignore')

# Master columns
MASTER_COLUMNS = [
    'Supplier Name', 'Supplier Code', 'Product Category', 'BRAND',
    'Brand Sub Tag', 'SKU / MODEL', 'PRODUCT DESCRIPTION', 'SUPPLIER SOH',
    'COST EX VAT', 'QTY ON ORDER', 'NEXT SHIPMENT', 'Tags', 'LINKS'
]

SOURCE_DIR = Path('/mnt/k/00Project/MantisNXT/database/Uploads/drive-download-20250904T012253Z-1-001')
OUTPUT_FILE = Path('/mnt/k/00Project/MantisNXT/database/Uploads/Consolidated_Batch3_Final.xlsx')

def clean_numeric(value):
    """Convert to float"""
    if pd.isna(value):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        value = re.sub(r'[R$€£,\s]', '', value)
        try:
            return float(value)
        except:
            return 0.0
    return 0.0

def create_master_row(supplier_name, supplier_code, row_dict):
    """Create a single master format row"""
    return {
        'Supplier Name': supplier_name,
        'Supplier Code': supplier_code,
        'Product Category': row_dict.get('category', 'General'),
        'BRAND': row_dict.get('brand', 'Unknown'),
        'Brand Sub Tag': row_dict.get('sub_tag', ''),
        'SKU / MODEL': str(row_dict.get('sku', '')),
        'PRODUCT DESCRIPTION': str(row_dict.get('description', '')),
        'SUPPLIER SOH': clean_numeric(row_dict.get('soh', 0)),
        'COST EX VAT': clean_numeric(row_dict.get('price', 0)),
        'QTY ON ORDER': int(row_dict.get('qty_on_order', 0)),
        'NEXT SHIPMENT': str(row_dict.get('next_shipment', '')),
        'Tags': str(row_dict.get('tags', '')),
        'LINKS': str(row_dict.get('links', ''))
    }

def process_stage_audio_works():
    """Process Stage Audio Works SOH info"""
    print("\n" + "="*80)
    print("PROCESSING: Stage Audio Works")
    print("="*80)
    
    file_path = SOURCE_DIR / 'Stage Audio Works SOH info_20250826_0247.xlsx'
    df = pd.read_excel(file_path, sheet_name='Data')
    
    print(f"Read {len(df)} rows")
    print(f"Columns: {list(df.columns)}")
    
    rows = []
    for _, row in df.iterrows():
        row_data = create_master_row(
            'Stage Audio Works',
            'STAGE-AUDIO',
            {
                'sku': row.get('Product No.', ''),
                'description': row.get('Product Description', ''),
                'soh': row.get('Total SOH', 0),
                'price': row.get('Price Before Discount Ex Vat', 0),
                'brand': row.get('Manufacturer Product No.', 'Stage Audio Works')[:30] if pd.notna(row.get('Manufacturer Product No.')) else 'Unknown'
            }
        )
        rows.append(row_data)
    
    master_df = pd.DataFrame(rows, columns=MASTER_COLUMNS)
    master_df = master_df[master_df['SKU / MODEL'].str.strip() != '']
    
    print(f"Processed {len(master_df)} rows")
    return master_df

def process_stage_one():
    """Process Stage One Distribution"""
    print("\n" + "="*80)
    print("PROCESSING: Stage One Distribution")
    print("="*80)
    
    file_path = SOURCE_DIR / 'Stage one FullPL-DP (7).xlsx'
    df = pd.read_excel(file_path, header=1)  # Headers at row 2
    
    print(f"Read {len(df)} rows")
    print(f"Columns: {list(df.columns)}")
    
    rows = []
    for _, row in df.iterrows():
        # First column appears to be SKU
        sku = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ''
        if sku.strip() == '' or sku == 'nan':
            continue
            
        row_data = create_master_row(
            'Stage One Distribution',
            'STAGE-ONE',
            {
                'sku': sku,
                'description': str(row.iloc[1]) if len(row) > 1 and pd.notna(row.iloc[1]) else '',
                'brand': str(row.iloc[2]) if len(row) > 2 and pd.notna(row.iloc[2]) else 'Unknown',
                'soh': row.iloc[3] if len(row) > 3 else 0,
                'price': row.iloc[4] if len(row) > 4 else 0
            }
        )
        rows.append(row_data)
    
    master_df = pd.DataFrame(rows, columns=MASTER_COLUMNS)
    print(f"Processed {len(master_df)} rows")
    return master_df

def process_sonic_informed():
    """Process Sonic Informed"""
    print("\n" + "="*80)
    print("PROCESSING: Sonic Informed")
    print("="*80)
    
    file_path = SOURCE_DIR / 'SonicInformed_20250808_I.xlsx'
    df = pd.read_excel(file_path, sheet_name='ALL')
    
    print(f"Read {len(df)} rows")
    
    rows = []
    for _, row in df.iterrows():
        sku = str(row.get('ITEM NUMBER', ''))
        if sku.strip() == '' or sku == 'nan' or 'CLICK HERE' in sku.upper():
            continue
            
        row_data = create_master_row(
            'Sonic Informed',
            'SONIC-INF',
            {
                'brand': row.get('PRICE LIST', 'Unknown'),
                'sku': sku,
                'description': row.get('PRODUCT DESCRIPTION', ''),
                'price': row.get('PRICE', 0),
                'soh': 1 if row.get('STOCK') == 'YES' else 0,
                'tags': row.get('NOTE', '')
            }
        )
        rows.append(row_data)
    
    master_df = pd.DataFrame(rows, columns=MASTER_COLUMNS)
    print(f"Processed {len(master_df)} rows")
    return master_df

def process_viva_afrika():
    """Process Viva Afrika"""
    print("\n" + "="*80)
    print("PROCESSING: Viva Afrika")
    print("="*80)
    
    file_path = SOURCE_DIR / 'Viva Afrika Dealer Price List 07 May 2025.xlsx'
    df = pd.read_excel(file_path, header=3)  # Data starts after header rows
    
    print(f"Read {len(df)} rows")
    print(f"Columns: {list(df.columns)}")
    
    rows = []
    for _, row in df.iterrows():
        sku = str(row.iloc[3]) if len(row) > 3 and pd.notna(row.iloc[3]) else ''
        if sku.strip() == '' or sku == 'nan':
            continue
            
        row_data = create_master_row(
            'Viva Afrika',
            'VIVA-AFRIKA',
            {
                'brand': str(row.iloc[1]) if len(row) > 1 and pd.notna(row.iloc[1]) else 'Viva Afrika',
                'sku': sku,
                'description': str(row.iloc[6]) if len(row) > 6 and pd.notna(row.iloc[6]) else '',
                'price': row.iloc[-2] if len(row) > 2 else 0  # Dealer price usually second to last
            }
        )
        rows.append(row_data)
    
    master_df = pd.DataFrame(rows, columns=MASTER_COLUMNS)
    print(f"Processed {len(master_df)} rows")
    return master_df

def process_yamaha():
    """Process Yamaha multi-sheet pricelist"""
    print("\n" + "="*80)
    print("PROCESSING: Yamaha")
    print("="*80)
    
    file_path = SOURCE_DIR / 'YAMAHA RETAIL PRICELIST NOV 2024 (2).xlsx'
    sheets = ['Digital Piano', 'Portable Keyboard', 'Guitars', 'Drums', 'MI-PA']
    
    all_rows = []
    
    for sheet in sheets:
        try:
            df = pd.read_excel(file_path, sheet_name=sheet, header=None)
            
            # Find data start
            for start_row in range(10):
                test_val = df.iloc[start_row, 0] if len(df) > start_row else None
                if pd.notna(test_val) and str(test_val).upper() not in ['GLOBAL', 'DEALER', 'PRICING', 'NAN']:
                    # Found data
                    df_data = pd.read_excel(file_path, sheet_name=sheet, header=start_row)
                    
                    for _, row in df_data.iterrows():
                        sku = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ''
                        if sku.strip() == '' or sku == 'nan':
                            continue
                            
                        retail_price = row.iloc[-1] if len(row) > 0 else 0
                        dealer_price = clean_numeric(retail_price) * 0.65  # Less 35%
                        
                        row_data = create_master_row(
                            'Yamaha',
                            'YAMAHA',
                            {
                                'brand': 'Yamaha',
                                'category': sheet,
                                'sku': sku,
                                'description': str(row.iloc[1]) if len(row) > 1 and pd.notna(row.iloc[1]) else '',
                                'price': dealer_price,
                                'tags': sheet
                            }
                        )
                        all_rows.append(row_data)
                    
                    print(f"  {sheet}: {len(df_data)} rows")
                    break
                    
        except Exception as e:
            print(f"  Error in {sheet}: {e}")
    
    master_df = pd.DataFrame(all_rows, columns=MASTER_COLUMNS)
    print(f"Total Yamaha rows: {len(master_df)}")
    return master_df

def main():
    print("="*80)
    print("BATCH 3 FINAL PROCESSING")
    print("="*80)
    
    results = {}
    
    # Process each supplier
    try:
        df = process_stage_audio_works()
        if df is not None and len(df) > 0:
            results['Stage Audio Works'] = df
    except Exception as e:
        print(f"ERROR: {e}")
    
    try:
        df = process_stage_one()
        if df is not None and len(df) > 0:
            results['Stage One Distribution'] = df
    except Exception as e:
        print(f"ERROR: {e}")
    
    try:
        df = process_sonic_informed()
        if df is not None and len(df) > 0:
            results['Sonic Informed'] = df
    except Exception as e:
        print(f"ERROR: {e}")
    
    try:
        df = process_viva_afrika()
        if df is not None and len(df) > 0:
            results['Viva Afrika'] = df
    except Exception as e:
        print(f"ERROR: {e}")
    
    try:
        df = process_yamaha()
        if df is not None and len(df) > 0:
            results['Yamaha'] = df
    except Exception as e:
        print(f"ERROR: {e}")
    
    # Write to Excel
    print("\n" + "="*80)
    print("WRITING TO EXCEL")
    print("="*80)
    
    with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
        for supplier_name, df in results.items():
            sheet_name = supplier_name[:31]
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            print(f"✓ {sheet_name}: {len(df)} rows")
    
    # Summary
    print("\n" + "="*80)
    print("BATCH 3 SUMMARY")
    print("="*80)
    
    total_rows = 0
    for supplier_name, df in results.items():
        rows = len(df)
        skus = df['SKU / MODEL'].nunique()
        brands = df['BRAND'].nunique()
        total_rows += rows
        
        print(f"\n{supplier_name}:")
        print(f"  Rows: {rows:,}")
        print(f"  Unique SKUs: {skus:,}")
        print(f"  Brands: {brands}")
        print(f"  Avg Price: R{df['COST EX VAT'].mean():,.2f}")
    
    print(f"\n{'='*80}")
    print(f"TOTAL: {total_rows:,} rows across {len(results)} suppliers")
    print(f"Output: {OUTPUT_FILE}")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()
