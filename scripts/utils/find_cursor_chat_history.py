#!/usr/bin/env python3
"""
Cursor Chat History Recovery Script
Searches Windows and WSL paths for Cursor chat history database files
"""

import os
import sys
from pathlib import Path
from datetime import datetime

def format_size(size_bytes):
    """Convert bytes to human-readable format"""
    if size_bytes == 0:
        return "0 B"
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"

def find_files(root_path, extensions):
    """Find files with given extensions in directory tree"""
    results = []
    root = Path(root_path)
    
    if not root.exists():
        return results
    
    try:
        for ext in extensions:
            for file_path in root.rglob(f"*{ext}"):
                try:
                    stat = file_path.stat()
                    results.append({
                        'path': str(file_path),
                        'size': stat.st_size,
                        'modified': datetime.fromtimestamp(stat.st_mtime),
                        'ext': ext
                    })
                except (OSError, PermissionError):
                    continue
    except (OSError, PermissionError) as e:
        pass
    
    return results

def main():
    print("=" * 60)
    print("Cursor Chat History Recovery Tool")
    print("=" * 60)
    print()
    
    # Database file extensions to search for
    extensions = ['.db', '.sqlite', '.sqlite3', '.db-wal', '.db-shm']
    
    # Windows paths
    username = os.environ.get('USER', os.environ.get('USERNAME', 'garet'))
    windows_paths = [
        f"/mnt/c/Users/{username}/AppData/Roaming/Cursor",
        f"/mnt/c/Users/{username}/AppData/Local/Cursor",
        f"/mnt/c/Users/{username}/.cursor",
    ]
    
    # WSL native paths
    wsl_paths = [
        f"{os.path.expanduser('~')}/.cursor",
        f"{os.path.expanduser('~')}/.config/Cursor",
    ]
    
    all_results = []
    
    print("Searching Windows paths (via WSL mount)...")
    for path in windows_paths:
        if os.path.exists(path):
            print(f"  Checking: {path}")
            results = find_files(path, extensions)
            all_results.extend(results)
            if results:
                print(f"    Found {len(results)} file(s)")
    
    print()
    print("Searching WSL native paths...")
    for path in wsl_paths:
        if os.path.exists(path):
            print(f"  Checking: {path}")
            results = find_files(path, extensions)
            all_results.extend(results)
            if results:
                print(f"    Found {len(results)} file(s)")
    
    print()
    print("=" * 60)
    print("Search Results")
    print("=" * 60)
    print()
    
    if not all_results:
        print("❌ No Cursor database files found.")
        print()
        print("Additional locations to check manually:")
        print(f"  - /mnt/c/Users/{username}/AppData/Roaming/Cursor/User/workspaceStorage/")
        print(f"  - /mnt/c/Users/{username}/AppData/Local/Cursor/User/workspaceStorage/")
        print("  - Check Windows Recycle Bin")
        print("  - Check backup software (if enabled)")
    else:
        print(f"✅ Found {len(all_results)} database file(s):")
        print()
        
        # Sort by modified date (newest first)
        all_results.sort(key=lambda x: x['modified'], reverse=True)
        
        # Print all files
        print(f"{'Path':<70} {'Size':<12} {'Modified':<20} {'Type'}")
        print("-" * 120)
        for result in all_results:
            path = result['path']
            if len(path) > 68:
                path = "..." + path[-65:]
            print(f"{path:<70} {format_size(result['size']):<12} {result['modified'].strftime('%Y-%m-%d %H:%M:%S'):<20} {result['ext']}")
        
        # Show potential chat history files
        db_files = [r for r in all_results if r['ext'] in ['.db', '.sqlite', '.sqlite3']]
        if db_files:
            print()
            print("Potential chat history files (sorted by modified date):")
            print()
            print(f"{'Path':<70} {'Size':<12} {'Modified'}")
            print("-" * 100)
            for result in db_files[:10]:
                path = result['path']
                if len(path) > 68:
                    path = "..." + path[-65:]
                print(f"{path:<70} {format_size(result['size']):<12} {result['modified'].strftime('%Y-%m-%d %H:%M:%S')}")
        
        print()
        print("To inspect a database file, use:")
        print('  sqlite3 "<path>" ".tables"')
        print('  sqlite3 "<path>" "SELECT name FROM sqlite_master WHERE type=\'table\';"')
    
    print()
    print("Script completed.")

if __name__ == "__main__":
    main()


