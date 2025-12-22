#!/bin/bash
# Cursor Chat History Recovery Script (WSL/Bash version)
# Searches Windows and WSL paths for Cursor chat history database files

echo "========================================"
echo "Cursor Chat History Recovery Tool"
echo "========================================"
echo ""

RESULTS_FILE="/tmp/cursor_chat_results.txt"
> "$RESULTS_FILE"

# Windows paths (via WSL mount)
WINDOWS_PATHS=(
    "/mnt/c/Users/$USER/AppData/Roaming/Cursor"
    "/mnt/c/Users/$USER/AppData/Local/Cursor"
    "/mnt/c/Users/$USER/.cursor"
)

# WSL native paths
WSL_PATHS=(
    "$HOME/.cursor"
    "$HOME/.config/Cursor"
    "/home/$USER/.cursor"
    "/home/$USER/.config/Cursor"
)

echo "Searching Windows paths (via WSL mount)..."
for path in "${WINDOWS_PATHS[@]}"; do
    if [ -d "$path" ]; then
        echo "  Checking: $path"
        find "$path" -type f \( -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" -o -name "*.db-wal" -o -name "*.db-shm" \) 2>/dev/null | while read -r file; do
            if [ -f "$file" ]; then
                size=$(stat -c%s "$file" 2>/dev/null || echo "0")
                size_mb=$(echo "scale=2; $size / 1024 / 1024" | bc 2>/dev/null || echo "0")
                modified=$(stat -c%y "$file" 2>/dev/null || echo "Unknown")
                ext="${file##*.}"
                echo "$file|${size_mb} MB|$modified|.$ext" >> "$RESULTS_FILE"
            fi
        done
    fi
done

echo ""
echo "Searching WSL native paths..."
for path in "${WSL_PATHS[@]}"; do
    if [ -d "$path" ]; then
        echo "  Checking: $path"
        find "$path" -type f \( -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" -o -name "*.db-wal" -o -name "*.db-shm" \) 2>/dev/null | while read -r file; do
            if [ -f "$file" ]; then
                size=$(stat -c%s "$file" 2>/dev/null || echo "0")
                size_mb=$(echo "scale=2; $size / 1024 / 1024" | bc 2>/dev/null || echo "0")
                modified=$(stat -c%y "$file" 2>/dev/null || echo "Unknown")
                ext="${file##*.}"
                echo "$file|${size_mb} MB|$modified|.$ext" >> "$RESULTS_FILE"
            fi
        done
    fi
done

echo ""
echo "========================================"
echo "Search Results"
echo "========================================"
echo ""

if [ ! -s "$RESULTS_FILE" ]; then
    echo "No Cursor database files found."
    echo ""
    echo "Additional locations to check manually:"
    echo "  - /mnt/c/Users/$USER/AppData/Roaming/Cursor/User/workspaceStorage/"
    echo "  - /mnt/c/Users/$USER/AppData/Local/Cursor/User/workspaceStorage/"
    echo "  - Check Windows Recycle Bin"
    echo "  - Check backup software (if enabled)"
else
    echo "Found database files:"
    echo ""
    echo "Path | Size | Modified | Type"
    echo "----------------------------------------"
    while IFS='|' read -r path size modified ext; do
        printf "%-60s | %-10s | %-20s | %s\n" "$path" "$size" "$modified" "$ext"
    done < "$RESULTS_FILE"
    
    echo ""
    echo "Potential chat history files (sorted by modified date):"
    echo ""
    grep -E "\.(db|sqlite|sqlite3)$" "$RESULTS_FILE" | sort -t'|' -k3 -r | head -10 | \
    while IFS='|' read -r path size modified ext; do
        printf "%-60s | %-10s | %s\n" "$path" "$size" "$modified"
    done
    
    echo ""
    echo "To inspect a database file, use:"
    echo "  sqlite3 \"<path>\" \".tables\""
    echo "  sqlite3 \"<path>\" \"SELECT name FROM sqlite_master WHERE type='table';\""
fi

echo ""
echo "Script completed."
rm -f "$RESULTS_FILE"


