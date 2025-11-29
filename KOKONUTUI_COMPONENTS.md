# KokonutUI Components Discovery

## Available Components

### Buttons (8 components)
- `@kokonutui/particle-button` - Particle Button
- `@kokonutui/v0-button` - V0 Button
- `@kokonutui/gradient-button` - Gradient Button
- `@kokonutui/attract-button` - Magnet Button
- `@kokonutui/hold-button` - Hold Button
- `@kokonutui/social-button` - Social Button
- `@kokonutui/command-button` - Command Button
- `@kokonutui/switch-button` - Switch Button

### Components (20 components)
- `@kokonutui/slide-text-button` - Slide Text Button
- `@kokonutui/loader` - Loader
- `@kokonutui/liquid-glass-card` - Liquid Glass
- `@kokonutui/action-search-bar` - Action Search Bar
- `@kokonutui/apple-activity-card` - Apple Activity Card
- `@kokonutui/beams-background` - Beams Background
- `@kokonutui/background-paths` - Background Paths
- `@kokonutui/mouse-effect-card` - Mouse Effect Card
- `@kokonutui/bento-grid` - Bento Grid
- `@kokonutui/card` - Card Flip
- `@kokonutui/card-stack` - Stack
- `@kokonutui/currency-transfer` - Currency Transfer
- `@kokonutui/file-upload` - File Upload
- `@kokonutui/profile-dropdown` - Profile Dropdown
- `@kokonutui/shape-hero` - Shapes Hero
- `@kokonutui/toolbar` - Toolbar
- `@kokonutui/tweet-card` - X Card
- `@kokonutui/team-selector` - Team Selector
- `@kokonutui/smooth-tab` - Smooth Tab
- `@kokonutui/smooth-drawer` - Smooth Drawer

### AI Components (5 components)
- `@kokonutui/ai-prompt` - AI Input Selector
- `@kokonutui/ai-input-search` - AI Input Search
- `@kokonutui/ai-loading` - AI State Loading
- `@kokonutui/ai-text-loading` - AI Text Loading
- `@kokonutui/ai-voice` - AI Voice

### Text Components (8 components)
- `@kokonutui/scroll-text` - Scroll Text
- `@kokonutui/typewriter` - Typing Text
- `@kokonutui/matrix-text` - Matrix Text
- `@kokonutui/dynamic-text` - Dynamic Text
- `@kokonutui/glitch-text` - Glitch Text
- `@kokonutui/shimmer-text` - Shimmer Text
- `@kokonutui/sliced-text` - Sliced Text
- `@kokonutui/swoosh-text` - Swoosh Text

**Total: 41 components**

## Migration Mapping

### Direct Replacements
- `Button` → `@kokonutui/particle-button` (with wrapper for API compatibility)
- `BentoGrid` (MagicUI) → `@kokonutui/bento-grid` (assess overlap)

### New Components (No Direct Replacement)
- All AI components (new functionality)
- All Text components (new functionality)
- Most specialized components (cards, drawers, etc.)

### Overlap Assessment

#### Buttons
- `shimmer-button` (MagicUI) vs `@kokonutui/particle-button` - Different: shimmer is gradient effect, particle is click animation
- `shimmer-button` vs `@kokonutui/gradient-button` - Similar gradient effects
- **Decision**: Keep both MagicUI shimmer-button and KokonutUI particle-button (different use cases)

#### Grids
- `bento-grid` (MagicUI) vs `@kokonutui/bento-grid` - Need to compare implementations
- **Decision**: Assess and potentially consolidate

#### Backgrounds
- `particles` (MagicUI) vs `@kokonutui/beams-background` or `@kokonutui/background-paths` - Different effects
- **Decision**: Keep MagicUI particles, add KokonutUI backgrounds as additional options

### Migration Strategy
1. Create Button wrapper that uses ParticleButton but maintains existing API
2. Keep MagicUI components where they provide unique functionality
3. Add KokonutUI components as enhancements where appropriate
4. Gradually migrate high-impact components (buttons, cards)


