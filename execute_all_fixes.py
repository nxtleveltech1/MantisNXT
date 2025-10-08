#!/usr/bin/env python3
"""
Master Fix Execution Script
============================
Executes all validation fixes in sequence.

Author: Python Agent Beta-2
Purpose: Orchestrate all fix phases
"""

import subprocess
import sys
from pathlib import Path
from datetime import datetime


def run_script(script_name, description):
    """Run a Python script and display results."""

    print("\n" + "█"*80)
    print(f"█  {description}")
    print("█"*80 + "\n")

    try:
        result = subprocess.run(
            [sys.executable, script_name],
            capture_output=False,
            text=True,
            check=True
        )
        print(f"\n✅ {description} - COMPLETE\n")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ {description} - FAILED\n")
        print(f"Error: {e}")
        return False


def main():
    """Execute all fix phases."""

    start_time = datetime.now()

    print("\n" + "="*80)
    print("SUPPLIER DATA FIX ORCHESTRATOR")
    print("="*80)
    print(f"Started: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)

    base_path = Path("/mnt/k/00Project/MantisNXT")

    # Phase 1: Fix column names in Batch 1 and Batch 3
    success_phase1 = run_script(
        base_path / "fix_column_names_batch1_batch3.py",
        "PHASE 1: Column Name Standardization (Batch 1 & 3)"
    )

    if not success_phase1:
        print("\n❌ Phase 1 failed. Stopping execution.")
        return

    # Phase 2: Populate supplier metadata in Batch 2
    success_phase2 = run_script(
        base_path / "fix_supplier_metadata_batch2.py",
        "PHASE 2: Supplier Metadata Population (Batch 2)"
    )

    if not success_phase2:
        print("\n❌ Phase 2 failed. Stopping execution.")
        return

    # Phase 3: Analyze Rockit duplicates
    success_phase3 = run_script(
        base_path / "analyze_rockit_duplicates.py",
        "PHASE 3: Rockit Duplicate Analysis"
    )

    # Phase 4: Re-run validation on fixed files
    print("\n" + "█"*80)
    print("█  PHASE 4: Re-validation on Fixed Files")
    print("█"*80 + "\n")

    print("⏳ Re-running comprehensive validation...")
    print("   This will validate the *_FIXED.xlsx files\n")

    # Note: This would require updating comprehensive_data_validation.py to check FIXED files
    print("⚠️  Manual step: Update comprehensive_data_validation.py to validate FIXED files")
    print("   Then run: python3 comprehensive_data_validation.py\n")

    # Summary
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    print("\n" + "="*80)
    print("FIX ORCHESTRATION COMPLETE")
    print("="*80)
    print(f"Total Duration: {duration:.1f} seconds")
    print(f"\nFixed Files Created:")
    print(f"  1. /database/Uploads/Consolidated_Supplier_Data_BATCH1_FIXED.xlsx")
    print(f"  2. /database/Uploads/Consolidated_Supplier_Data_Batch2_FIXED.xlsx")
    print(f"  3. /database/Uploads/Consolidated_Batch3_Final_FIXED.xlsx")
    print(f"\nNext Steps:")
    print(f"  1. Review Rockit duplicate analysis")
    print(f"  2. Decide on deduplication strategy")
    print(f"  3. Re-run validation on FIXED files")
    print(f"  4. Proceed to Master aggregation")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
