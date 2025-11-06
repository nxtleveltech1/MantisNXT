# Supplier Inventory Portfolio - Design Specification

**Version:** 1.0
**Date:** 2025-11-05
**Design System:** MagicDashboard Gradient System

---

## 1. Design Philosophy

The Supplier Inventory Portfolio redesign follows the **MagicDashboard** design system, emphasizing:

1. **Gradient-Based Visual Hierarchy** - Subtle gradients create depth without overwhelming content
2. **Color-Coded Information** - Each metric category has a unique color for quick recognition
3. **Minimalist Borders** - Borderless cards with shadow-based separation
4. **Smooth Animations** - 300ms transitions for all interactive elements
5. **Responsive Grid System** - Adapts from 1 to 4 columns based on viewport

---

## 2. Color Palette

### 2.1 Chart Colors (HSL Format)

From `src/app/globals.css`:

```css
--chart-1: 150 65% 55%;  /* #4ac885 - Green (Success, Growth) */
--chart-2: 262 100% 60%; /* #7033ff - Purple (Technology, Innovation) */
--chart-3: 330 98% 71%;  /* #fe69dc - Hot Pink (Highlight, Selection) */
--chart-4: 200 60% 50%;  /* Blue (Information, Trust) */
--chart-5: 38 92% 50%;   /* Amber (Value, Worth) */
```

### 2.2 Color Usage Map

| Metric | Chart Color | Color Name | Hex | Usage |
|--------|-------------|------------|-----|-------|
| Active Suppliers | chart-1 | Green | #4ac885 | Growth metrics |
| Products in Catalog | chart-2 | Purple | #7033ff | Inventory counts |
| Selected Products | chart-3 | Hot Pink | #fe69dc | User selections |
| Inventory Value | chart-5 | Amber | #f59e0b | Financial data |

### 2.3 Semantic Colors

```css
--success: 150 65% 55%;    /* Green - Success states */
--warning: 38 92% 50%;     /* Amber - Warning states */
--destructive: 358 72% 59%; /* Red - Error states */
--info: 262 100% 60%;      /* Purple - Information */
```

---

## 3. Component Specifications

### 3.1 Metric Cards

#### Structure
```
┌─────────────────────────────────────────┐
│ ╔═══════════════════════════════════╗   │
│ ║ Gradient Background Layer         ║   │
│ ║   ┌─────────────────────────────┐ ║   │
│ ║   │ Radial Glow (top-right)     │ ║   │
│ ║   └─────────────────────────────┘ ║   │
│ ╚═══════════════════════════════════╝   │
│                                          │
│  Active Suppliers        [Icon]          │
│  ┌──────────────────────────────────┐   │
│  │  1,234                           │   │
│  └──────────────────────────────────┘   │
│  ↑ +12%  vs last month                  │
│                                          │
└─────────────────────────────────────────┘
```

#### Dimensions
- **Card Padding:** 24px (p-6)
- **Icon Container:** 48x48px (h-12 w-12)
- **Border Radius:** 12px (rounded-xl)
- **Shadow:** Elevation 1 → Elevation 3 on hover

#### Gradient Implementation

**Layer 1: Base Gradient**
```tsx
<div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 via-transparent to-chart-1/5" />
```

- **Direction:** Bottom-right diagonal
- **Start:** 10% opacity of chart color
- **Middle:** Transparent
- **End:** 5% opacity of chart color

**Layer 2: Radial Glow**
```tsx
<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-chart-1/20 to-transparent rounded-full blur-2xl" />
```

- **Size:** 128x128px
- **Position:** Top-right corner
- **Opacity:** 20% at center, fading to transparent
- **Blur:** 48px (blur-2xl)

#### Icon Container

**Specifications:**
- **Size:** 48x48px
- **Border Radius:** 12px (rounded-xl)
- **Gradient:** from-chart-X to-chart-X/80
- **Shadow:** 0 10px 25px chart-color/30
- **Icon Size:** 24x24px (h-6 w-6)
- **Icon Color:** White (#ffffff)

**Hover Effect:**
```css
transform: scale(1.1);
transition: transform 300ms ease-in-out;
```

#### Typography

**Metric Label:**
- Font size: 14px (text-sm)
- Font weight: 500 (font-medium)
- Color: Muted foreground
- Line height: 20px

**Metric Value:**
- Font size: 36px (text-4xl)
- Font weight: 700 (font-bold)
- Letter spacing: -0.025em (tracking-tight)
- Line height: 40px

**Trend Indicator:**
- Font size: 14px (text-sm)
- Trend Icon: 14px (h-3.5 w-3.5)
- Trend Percentage: Font weight 600 (font-semibold)

---

### 3.2 Status Badges

#### Badge Variants

**Received (Processing)**
```tsx
<Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-sm shadow-blue-200">
  <Clock className="h-3 w-3" />
  Received
</Badge>
```

**Validating (In Progress)**
```tsx
<Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 shadow-sm shadow-yellow-200">
  <Loader2 className="h-3 w-3 animate-spin" />
  Validating
</Badge>
```

**Validated (Ready)**
```tsx
<Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-sm shadow-emerald-200">
  <CheckCircle className="h-3 w-3" />
  Validated
</Badge>
```

**Merged (Success)**
```tsx
<Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 shadow-md shadow-green-300">
  <CheckCircle2 className="h-3.5 w-3.5" />
  Merged
</Badge>
```

**Failed (Error)**
```tsx
<Badge className="bg-gradient-to-r from-red-600 to-rose-600 text-white border-0 shadow-md shadow-red-300">
  <XCircle className="h-3.5 w-3.5" />
  Failed
</Badge>
```

#### Badge Specifications
- **Padding:** 12px horizontal, 4px vertical (px-3 py-1)
- **Border Radius:** 6px (rounded-md)
- **Font Size:** 12px (text-xs)
- **Font Weight:** 600 (font-semibold) for success/error, 500 for others
- **Icon Size:** 14px (h-3.5 w-3.5) for emphasis, 12px (h-3 w-3) for standard
- **Gap:** 6px (gap-1.5)

---

### 3.3 Recent Uploads Table

#### Header Styling
```tsx
<TableHeader>
  <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2 border-border">
    <TableHead className="font-semibold text-xs uppercase tracking-wide text-foreground">
      Supplier
    </TableHead>
  </TableRow>
</TableHeader>
```

**Specifications:**
- **Background:** Muted color at 50% opacity
- **Border:** 2px bottom border
- **Font Size:** 12px (text-xs)
- **Text Transform:** Uppercase
- **Letter Spacing:** Wide (tracking-wide)
- **Font Weight:** 600 (font-semibold)

#### Row Styling

**Alternating Colors:**
```tsx
<TableRow className={cn(
  "hover:bg-accent/50 transition-colors cursor-pointer group border-b border-border/50",
  index % 2 === 0 ? "bg-background" : "bg-muted/20"
)}>
```

**Row Specifications:**
- **Even rows:** Background color
- **Odd rows:** Muted at 20% opacity
- **Hover:** Accent color at 50% opacity
- **Border:** Bottom border at 50% opacity
- **Cursor:** Pointer (clickable)
- **Transition:** 200ms color transition

#### Supplier Avatar
```tsx
<div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
  {upload.supplier_name.charAt(0).toUpperCase()}
</div>
```

**Specifications:**
- **Size:** 32x32px
- **Border Radius:** Full circle
- **Gradient:** Purple to pink
- **Font Size:** 12px (text-xs)
- **Font Weight:** 700 (font-bold)
- **Shadow:** Small shadow

---

### 3.4 Quick Actions Panel

#### Action Button Styling

**Primary Action (Upload)**
```tsx
<Button className="w-full justify-start" variant="default">
  <Upload className="h-4 w-4 mr-2" />
  Upload Pricelist
  <ArrowRight className="h-4 w-4 ml-auto" />
</Button>
```

**Secondary Actions**
```tsx
<Button className="w-full justify-start" variant="outline">
  <CheckCircle2 className="h-4 w-4 mr-2" />
  Manage Selections
  <ArrowRight className="h-4 w-4 ml-auto" />
</Button>
```

**Specifications:**
- **Width:** Full width of container
- **Justify:** Start (left-aligned content)
- **Leading Icon:** 16px, 8px right margin
- **Trailing Icon:** 16px, auto left margin
- **Height:** 40px (default button height)
- **Gap:** 8px between icon and text

---

### 3.5 Workflow Progress Indicator

#### Step Visualization

```
┌─────────────┐    →    ┌─────────────┐    →    ┌─────────────┐
│   Upload    │         │   Select    │         │    Stock    │
│     [🔼]     │         │     [✓]     │         │     [📊]     │
│      X      │         │      Y      │         │      Z      │
│  Complete   │         │  Products   │         │  Inventory  │
└─────────────┘         └─────────────┘         └─────────────┘
```

**Icon Container:**
- **Size:** 64x64px (w-16 h-16)
- **Background:** Color-100 (light variant)
- **Border Radius:** Full circle
- **Icon:** 32x32px (h-8 w-8)
- **Icon Color:** Color-600

**Typography:**
- **Label:** 14px, font-medium
- **Value:** 24px (text-2xl), font-bold, colored
- **Description:** 12px (text-xs), muted-foreground

---

## 4. Responsive Breakpoints

### 4.1 Metric Cards Grid

**Mobile (< 768px):**
```tsx
grid-cols-1  // 1 column, stacked vertically
```

**Tablet (768px - 1024px):**
```tsx
md:grid-cols-2  // 2 columns side-by-side
```

**Desktop (> 1024px):**
```tsx
lg:grid-cols-4  // 4 columns, full width
```

### 4.2 Main Content Grid

**Current (Desktop only):**
```tsx
grid-cols-3  // Fixed 3 columns
col-span-2   // Recent uploads takes 2/3 width
```

**Recommended (Responsive):**
```tsx
grid-cols-1 lg:grid-cols-3     // Stack on mobile, 3 cols on desktop
lg:col-span-2                   // 2/3 width only on desktop
```

---

## 5. Animation Specifications

### 5.1 Card Hover Animation

**Properties:**
```css
transition: all 300ms ease-in-out;
transform: translateY(-4px);  /* Subtle lift */
box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

**Timeline:**
- **0ms:** Initial state
- **300ms:** Hover state (lifted + shadow)

### 5.2 Icon Container Hover

**Properties:**
```css
transition: transform 300ms ease-in-out;
transform: scale(1.1);  /* 10% larger */
```

### 5.3 NumberTicker Animation

**Behavior:**
- Counts up from 0 to target value
- Duration: ~1 second
- Easing: Ease-out
- Animates on mount only

**Usage:**
```tsx
<NumberTicker value={metrics?.total_suppliers || 0} />
```

---

## 6. Spacing System

### 6.1 Grid Gaps

| Element | Gap | Tailwind Class |
|---------|-----|----------------|
| Metric Cards | 16px | gap-4 |
| Main Content Grid | 24px | gap-6 |
| Quick Actions Buttons | 12px | space-y-3 |
| Activity Items | 12px | space-y-3 |

### 6.2 Card Padding

| Element | Padding | Tailwind Class |
|---------|---------|----------------|
| Card Content | 24px | p-6 |
| Card Header | 16px bottom | pb-4 |
| Table Cell | 16px vertical | py-4 |

---

## 7. Typography Scale

### 7.1 Heading Hierarchy

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| H1 | 30px (text-3xl) | 700 (font-bold) | Page title |
| H2 | 18px (text-lg) | 600 (font-semibold) | Card titles |
| H3 | 14px (text-sm) | 500 (font-medium) | Section headers |

### 7.2 Body Text

| Type | Size | Weight | Usage |
|------|------|--------|-------|
| Body | 14px (text-sm) | 400 (font-normal) | Standard text |
| Label | 14px (text-sm) | 500 (font-medium) | Form labels |
| Caption | 12px (text-xs) | 400 (font-normal) | Helper text |
| Muted | 14px (text-sm) | 400 (font-normal) | Secondary text |

### 7.3 Metric Display

| Type | Size | Weight | Usage |
|------|------|--------|-------|
| Large Metric | 36px (text-4xl) | 700 (font-bold) | Key metrics |
| Medium Metric | 24px (text-2xl) | 700 (font-bold) | Workflow values |
| Small Metric | 14px (text-sm) | 600 (font-semibold) | Trend indicators |

---

## 8. Shadow System

### 8.1 Elevation Levels

**Elevation 0 (Flat):**
```css
box-shadow: none;
```

**Elevation 1 (Resting):**
```css
box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);  /* shadow-sm */
```

**Elevation 2 (Raised):**
```css
box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);  /* shadow-md */
```

**Elevation 3 (Floating):**
```css
box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);  /* shadow-lg */
```

### 8.2 Colored Shadows

**Pattern:**
```css
box-shadow: 0 10px 25px hsl(var(--chart-X) / 0.3);
```

**Usage:**
- Icon containers
- Emphasized badges
- Primary action buttons

---

## 9. Border System

### 9.1 Border Widths

| Width | Value | Usage |
|-------|-------|-------|
| Default | 1px | Standard borders |
| Heavy | 2px | Table headers, dividers |
| None | 0px | Metric cards, modern UI |

### 9.2 Border Colors

**Light Mode:**
```css
--border: 252 9% 94%;  /* #e7e7ee - Light Purple Gray */
```

**Dark Mode:**
```css
--border: 217 33% 18%;  /* #1e293b - Dark Slate */
```

**Usage:**
- 100% opacity for visible borders
- 50% opacity for subtle dividers
- 20% opacity for ghost borders

---

## 10. Accessibility

### 10.1 Focus States

**All Interactive Elements:**
```css
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

**Ring Color:**
- Light mode: Black (#000000)
- Dark mode: Bright blue (#0066ff)

### 10.2 Color Contrast Ratios

| Element | Ratio | WCAG Level |
|---------|-------|------------|
| Body text | 21:1 | AAA |
| Muted text | 4.8:1 | AA |
| Large text (18px+) | 7:1 | AAA |
| UI components | 4.5:1 | AA |

### 10.3 Interactive States

**Minimum Requirements:**
- ✅ Hover state clearly visible
- ✅ Focus state with visible outline
- ✅ Active state feedback
- ✅ Disabled state clearly indicated

---

## 11. Dark Mode Considerations

### 11.1 Background Adjustments

**Light Mode:**
- Background: #fdfdfd (Off white)
- Cards: #fdfdfd (Same as background)

**Dark Mode:**
- Background: #0f1729 (Dark blue-gray)
- Cards: #0f1729 (Same as background)

### 11.2 Gradient Opacity

**Light Mode:**
- Base gradient: 10% to 5%
- Glow: 20% opacity

**Dark Mode:**
- Base gradient: 15% to 8% (slightly more visible)
- Glow: 25% opacity (more pronounced)

---

## 12. Print Styles

**Global Print Rules:**
```css
@media print {
  * {
    transition: none !important;
    animation: none !important;
  }
}
```

**Recommendations:**
- Remove all animations
- Flatten gradients to solid colors
- Hide interactive elements (buttons)
- Optimize for grayscale printing

---

## 13. Performance Guidelines

### 13.1 GPU Acceleration

**Always Use:**
- `transform` (instead of `top`/`left`/`width`/`height`)
- `opacity` (instead of `visibility`)
- `will-change: transform` (for animated elements)

### 13.2 Avoid

- Layout-triggering properties during animation
- Excessive blur values (> 100px)
- Too many gradients layered (max 3 per card)

### 13.3 Optimization

**Gradient Recommendations:**
- Use CSS gradients (not images)
- Limit gradient stops to 3-4 per gradient
- Reuse gradient classes where possible

---

## 14. Implementation Checklist

### Developer Checklist

- [ ] All HSL color values use `hsl(var(--chart-X))` format
- [ ] Gradients use proper opacity values (/ syntax)
- [ ] Hover states use `group-hover:` when applicable
- [ ] All transitions are 300ms or less
- [ ] Focus states are visible and accessible
- [ ] Responsive classes are applied
- [ ] Dark mode is tested
- [ ] Print styles are considered
- [ ] Performance is optimized (60fps)

---

## 15. Design Tokens Reference

### Quick Copy-Paste

**Metric Card Structure:**
```tsx
<Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
  <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 via-transparent to-chart-1/5" />
  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-chart-1/20 to-transparent rounded-full blur-2xl" />
  <CardContent className="relative p-6">
    {/* Content */}
  </CardContent>
</Card>
```

**Icon Container:**
```tsx
<div className="h-12 w-12 rounded-xl bg-gradient-to-br from-chart-1 to-chart-1/80 flex items-center justify-center shadow-lg shadow-chart-1/30 group-hover:scale-110 transition-transform duration-300">
  <Icon className="h-6 w-6 text-white" />
</div>
```

**Trend Indicator:**
```tsx
<div className="flex items-center gap-1 px-2 py-1 rounded-md bg-chart-1/10">
  <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--chart-1))]" />
  <span className="text-[hsl(var(--chart-1))] font-semibold">+12%</span>
</div>
```

---

**END OF DESIGN SPECIFICATION**
**Version:** 1.0
**Last Updated:** 2025-11-05
