# Cursor Chat History Recovery Script
# Searches Windows and WSL paths for Cursor chat history database files

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cursor Chat History Recovery Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$results = @()

# Windows AppData paths
$windowsPaths = @(
    "$env:APPDATA\Cursor",
    "$env:LOCALAPPDATA\Cursor",
    "$env:USERPROFILE\AppData\Roaming\Cursor",
    "$env:USERPROFILE\AppData\Local\Cursor"
)

# WSL paths (mapped to Windows)
$wslPaths = @(
    "/mnt/c/Users/$env:USERNAME/AppData/Roaming/Cursor",
    "/mnt/c/Users/$env:USERNAME/AppData/Local/Cursor",
    "/mnt/c/Users/$env:USERNAME/.cursor"
)

Write-Host "Searching Windows paths..." -ForegroundColor Yellow
foreach ($path in $windowsPaths) {
    if (Test-Path $path) {
        Write-Host "  Checking: $path" -ForegroundColor Gray
        $dbFiles = Get-ChildItem -Path $path -Recurse -Include "*.db", "*.sqlite", "*.sqlite3", "*.db-wal", "*.db-shm" -ErrorAction SilentlyContinue
        foreach ($file in $dbFiles) {
            $results += [PSCustomObject]@{
                Path = $file.FullName
                Size = "$([math]::Round($file.Length / 1MB, 2)) MB"
                Modified = $file.LastWriteTime
                Type = $file.Extension
            }
        }
    }
}

Write-Host ""
Write-Host "Searching WSL paths..." -ForegroundColor Yellow

# Check if WSL is available
try {
    $wslCheck = wsl --list --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        foreach ($wslPath in $wslPaths) {
            Write-Host "  Checking WSL: $wslPath" -ForegroundColor Gray
            $wslResult = wsl bash -c "find '$wslPath' -type f \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' -o -name '*.db-wal' -o -name '*.db-shm' \) 2>/dev/null" 2>&1
            if ($wslResult -and $wslResult.Count -gt 0) {
                foreach ($line in $wslResult) {
                    if ($line -match '^/') {
                        $wslFile = wsl bash -c "stat -c '%s|%y' '$line' 2>/dev/null" 2>&1
                        if ($wslFile) {
                            $parts = $wslFile -split '\|'
                            $size = if ($parts[0]) { "$([math]::Round([int]$parts[0] / 1MB, 2)) MB" } else { "Unknown" }
                            $modified = if ($parts[1]) { $parts[1] } else { "Unknown" }
                            $ext = [System.IO.Path]::GetExtension($line)
                            $results += [PSCustomObject]@{
                                Path = $line
                                Size = $size
                                Modified = $modified
                                Type = $ext
                            }
                        }
                    }
                }
            }
        }
    }
} catch {
    Write-Host "  WSL not available or error accessing WSL paths" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Search Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($results.Count -eq 0) {
    Write-Host "No Cursor database files found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Additional locations to check manually:" -ForegroundColor Yellow
    Write-Host "  - %APPDATA%\Cursor\User\workspaceStorage\" -ForegroundColor Gray
    Write-Host "  - %LOCALAPPDATA%\Cursor\User\workspaceStorage\" -ForegroundColor Gray
    Write-Host "  - Check Windows Recycle Bin" -ForegroundColor Gray
    Write-Host "  - Check backup software (if enabled)" -ForegroundColor Gray
} else {
    Write-Host "Found $($results.Count) database file(s):" -ForegroundColor Green
    Write-Host ""
    $results | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "Potential chat history files (sorted by size/modified date):" -ForegroundColor Yellow
    $results | Where-Object { $_.Type -in @('.db', '.sqlite', '.sqlite3') } | 
        Sort-Object Modified -Descending | 
        Select-Object -First 10 Path, Size, Modified | 
        Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "To inspect a database file, use:" -ForegroundColor Cyan
    Write-Host "  sqlite3 `"<path>`" `.tables" -ForegroundColor Gray
    Write-Host "  sqlite3 `"<path>`" `"SELECT name FROM sqlite_master WHERE type='table';`"" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Script completed." -ForegroundColor Green


