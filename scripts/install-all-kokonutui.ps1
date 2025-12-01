# Install all KokonutUI components with proper error handling
$components = @(
    # Buttons
    "@kokonutui/particle-button",
    "@kokonutui/v0-button",
    "@kokonutui/gradient-button",
    "@kokonutui/attract-button",
    "@kokonutui/hold-button",
    "@kokonutui/social-button",
    "@kokonutui/command-button",
    "@kokonutui/switch-button",
    # Components
    "@kokonutui/slide-text-button",
    "@kokonutui/loader",
    "@kokonutui/liquid-glass-card",
    "@kokonutui/action-search-bar",
    "@kokonutui/apple-activity-card",
    "@kokonutui/beams-background",
    "@kokonutui/background-paths",
    "@kokonutui/mouse-effect-card",
    "@kokonutui/bento-grid",
    "@kokonutui/card",
    "@kokonutui/card-stack",
    "@kokonutui/currency-transfer",
    "@kokonutui/file-upload",
    "@kokonutui/profile-dropdown",
    "@kokonutui/shape-hero",
    "@kokonutui/toolbar",
    "@kokonutui/tweet-card",
    "@kokonutui/team-selector",
    "@kokonutui/smooth-tab",
    "@kokonutui/smooth-drawer",
    # AI Components
    "@kokonutui/ai-prompt",
    "@kokonutui/ai-input-search",
    "@kokonutui/ai-loading",
    "@kokonutui/ai-text-loading",
    "@kokonutui/ai-voice",
    # Text Components
    "@kokonutui/scroll-text",
    "@kokonutui/matrix-text",
    "@kokonutui/dynamic-text",
    "@kokonutui/glitch-text",
    "@kokonutui/shimmer-text",
    "@kokonutui/sliced-text",
    "@kokonutui/swoosh-text"
)

$failed = @()
$success = @()

foreach ($component in $components) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Installing $component..." -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    # Install with overwrite flag and auto-yes to prompts
    $result = echo y | npx shadcn@latest add $component --yes --overwrite 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully installed $component" -ForegroundColor Green
        $success += $component
    } else {
        Write-Host "✗ Failed to install $component" -ForegroundColor Red
        Write-Host "Error output: $result" -ForegroundColor Red
        $failed += $component
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Installation Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Successful: $($success.Count)" -ForegroundColor Green
Write-Host "Failed: $($failed.Count)" -ForegroundColor $(if ($failed.Count -eq 0) { "Green" } else { "Red" })

if ($failed.Count -gt 0) {
    Write-Host "`nFailed components:" -ForegroundColor Red
    foreach ($f in $failed) {
        Write-Host "  - $f" -ForegroundColor Red
    }
}

