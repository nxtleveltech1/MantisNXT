# Install all KokonutUI components
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
    "@kokonutui/typewriter",
    "@kokonutui/matrix-text",
    "@kokonutui/dynamic-text",
    "@kokonutui/glitch-text",
    "@kokonutui/shimmer-text",
    "@kokonutui/sliced-text",
    "@kokonutui/swoosh-text"
)

foreach ($component in $components) {
    Write-Host "Installing $component..."
    echo N | npx shadcn@latest add $component --yes
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install $component" -ForegroundColor Red
    }
}







