# KokonutUI Migration Guide

## Overview

This document outlines the migration from shadcn/ui and MagicUI components to KokonutUI components where applicable.

## Migration Status

✅ **Infrastructure Setup Complete**
- KokonutUI registry added to `components.json`
- All 41+ KokonutUI components installed
- Utilities verified and compatible

✅ **Button Migration Complete**
- Enhanced Button wrapper created (`button-enhanced.tsx`)
- ParticleButtonEnhanced created (without auto-icon)
- Backward compatible with existing Button API

## Component Mapping

### Buttons

#### Standard Button → Enhanced Button (Optional)
```tsx
// Before
import { Button } from "@/components/ui/button";

// After (with particles)
import { EnhancedButton } from "@/components/ui/button-enhanced";
<EnhancedButton enableParticles={true}>Click me</EnhancedButton>

// Or keep using standard Button (no particles)
import { Button } from "@/components/ui/button";
<Button>Click me</Button>
```

#### Specialized Buttons
- `ShimmerButton` (MagicUI) → Keep for gradient effects
- `ParticleButton` (KokonutUI) → Use for click animations
- `GradientButton` (KokonutUI) → Alternative to ShimmerButton
- `AttractButton` (KokonutUI) → Magnet effect button
- `HoldButton` (KokonutUI) → Long-press button

### Grids

#### BentoGrid
- **MagicUI**: Simple grid layout (`src/components/magicui/bento-grid.tsx`)
- **KokonutUI**: Advanced grid with animations (`src/components/kokonutui/bento-grid.tsx`)

**Decision**: Keep both - MagicUI for simple layouts, KokonutUI for advanced features

### Backgrounds

- **MagicUI Particles**: Simple particle system
- **KokonutUI BeamsBackground**: Beam light effects
- **KokonutUI BackgroundPaths**: Animated path backgrounds

**Decision**: Keep all - different visual effects for different use cases

## Usage Examples

### Enhanced Button with Particles
```tsx
import { EnhancedButton } from "@/components/ui/button-enhanced";

<EnhancedButton 
  enableParticles={true}
  onParticleSuccess={() => console.log("Animation complete")}
  variant="default"
>
  Submit
</EnhancedButton>
```

### KokonutUI Components
```tsx
import { ParticleButton, BentoGrid, AILoading } from "@/components/kokonutui";

// Use directly
<ParticleButton>Click me</ParticleButton>
<BentoGrid items={items} />
<AILoading />
```

## Migration Strategy

### Phase 1: Additive (Current)
- Keep all existing components
- Add KokonutUI components alongside
- Use EnhancedButton where particle effects desired

### Phase 2: Gradual Migration (Future)
- Replace buttons in high-impact areas with EnhancedButton
- Migrate specialized components to KokonutUI versions
- Consolidate overlapping components

### Phase 3: Full Migration (Optional)
- Replace all buttons with EnhancedButton
- Remove MagicUI components where KokonutUI equivalents exist
- Standardize on KokonutUI for new features

## Component Overlap Decisions

| Component | MagicUI | KokonutUI | Decision |
|-----------|---------|-----------|----------|
| Button | Standard | ParticleButton | Keep both, use EnhancedButton wrapper |
| ShimmerButton | Gradient effect | GradientButton | Keep both (different implementations) |
| BentoGrid | Simple grid | Advanced grid | Keep both (different complexity) |
| Particles | Simple particles | BeamsBackground/BackgroundPaths | Keep all (different effects) |

## Import Paths

### Standard Imports
```tsx
// Existing shadcn/ui components
import { Button } from "@/components/ui/button";

// Enhanced components
import { EnhancedButton } from "@/components/ui/button-enhanced";

// KokonutUI components
import { ParticleButton } from "@/components/kokonutui";
// or
import ParticleButton from "@/components/kokonutui/particle-button";
```

## Testing Checklist

- [x] All KokonutUI components installed
- [x] Button wrapper maintains API compatibility
- [ ] Type-check passes
- [ ] Lint passes
- [ ] Build succeeds
- [ ] Visual regression tests pass
- [ ] Critical user flows tested

## Next Steps

1. Test EnhancedButton in key areas
2. Gradually migrate high-visibility buttons
3. Evaluate MagicUI vs KokonutUI for consolidation
4. Document component selection guidelines




