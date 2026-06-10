# Design System Migration Checklist

## ✅ Completed Pages

- [x] `/app/auth/signin/page.tsx` - Updated to use design system
- [x] `/app/auth/signup/page.tsx` - Updated to use design system
- [x] `tailwind.config.ts` - Colors, typography, spacing updated
- [x] `/lib/designSystem.ts` - Central design system file created

## 📋 Pages to Update

Follow the pattern below to update each page:

### Step 1: Import Design System
At the top of the file, add:
```tsx
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, STYLES, mergeStyles } from "@/lib/designSystem";
```

### Step 2: Find and Replace

Use find/replace to update styles:

| Find | Replace | Notes |
|------|---------|-------|
| `color: "#0d1c2e"` | `color: COLORS.onSurface` | Primary text |
| `color: "#4a4455"` | `color: COLORS.onSurfaceVariant` | Secondary text |
| `color: "#7c3aed"` | `color: COLORS.primaryContainer` | Purple buttons |
| `color: "#630ed4"` | `color: COLORS.primary` | Dark purple |
| `background: "#f8f9ff"` | `background: COLORS.background` | Page background |
| `background: "#ffffff"` | `background: COLORS.surface` | Card background |
| `color: "#16a34a"` | `color: COLORS.success` | Green (owed) |
| `color: "#e11d48"` | `color: COLORS.error` | Red (owing) |
| `padding: "16px"` | `padding: SPACING.md` | Internal padding |
| `padding: "24px"` | `padding: SPACING.lg` | Section gaps |
| `borderRadius: 12` | `borderRadius: BORDER_RADIUS.lg` | Card radius |
| `borderRadius: 16` | `borderRadius: BORDER_RADIUS.xl` | Large radius |
| `borderRadius: 9999` | `borderRadius: BORDER_RADIUS.full` | Pill buttons |
| `fontSize: "16px", fontWeight: 500` | `...STYLES.bodyText` | Body text |

### Step 3: Use Pre-built Styles

Replace inline style objects with pre-built ones:

```tsx
// ❌ Before
<div style={{ background: "#fff", borderRadius: 12, boxShadow: "...", padding: "16px" }}>
  
// ✅ After
<div style={STYLES.card}>
```

### Step 4: Test

- [ ] Colors match the design system
- [ ] Buttons are pill-shaped (#7c3aed background)
- [ ] Spacing is consistent (16px internal padding, 24px gaps)
- [ ] Shadows match design system (soft elevation)
- [ ] No hardcoded color values remain

## Pages Status

### Auth Pages
- [ ] `/app/auth/forgot-password/page.tsx`
- [ ] `/app/auth/reset-password/page.tsx`

### Dashboard & Main Pages
- [ ] `/app/page.tsx` - Home/Dashboard
- [ ] `/app/layout.tsx` - Main layout
- [ ] `/app/groups/page.tsx` - My Groups
- [ ] `/app/groups/[id]/page.tsx` - Group detail
- [ ] `/app/friends/page.tsx` - Friends list
- [ ] `/app/activity/page.tsx` - Activity feed
- [ ] `/app/analytics/page.tsx` - Analytics

### Form Pages
- [ ] `/app/groups/new/page.tsx` - Create group
- [ ] `/app/groups/[id]/expenses/new/page.tsx` - Add expense
- [ ] `/app/groups/[id]/expenses/[expenseId]/edit/page.tsx` - Edit expense
- [ ] `/app/profile/page.tsx` - User profile
- [ ] `/app/invite/[token]/page.tsx` - Invite acceptance

## Quick Reference: Most Common Replacements

### Colors
```tsx
// Text colors
color: COLORS.onSurface               // Primary text (#0d1c2e)
color: COLORS.onSurfaceVariant        // Secondary text (#4a4455)

// Background colors
background: COLORS.background         // Page background (#f8f9ff)
background: COLORS.surface            // Card background (#ffffff)

// Functional colors
background: COLORS.primaryContainer   // Purple button (#7c3aed)
border: `1px solid ${COLORS.outline}` // Input borders (#cbd5e1)
color: COLORS.success                 // Green (#16a34a)
color: COLORS.error                   // Red (#e11d48)
```

### Spacing
```tsx
padding: SPACING.md           // 16px - internal padding
margin: SPACING.lg            // 24px - section gaps
gap: SPACING.sm               // 8px - small gaps
gap: SPACING.md               // 16px - medium gaps
```

### Styles
```tsx
// Ready-to-use components
style={STYLES.card}           // Standard card
style={STYLES.cardLarge}      // Large card with medium shadow
style={STYLES.buttonPrimary}  // Purple pill button
style={STYLES.buttonSecondary} // Outline button
style={STYLES.input}          // Form input
style={STYLES.label}          // Form label
style={STYLES.headingLg}      // Large heading (32px)
style={STYLES.headingMd}      // Medium heading (24px)
style={STYLES.bodyText}       // Body text
style={STYLES.secondaryText}  // Secondary text
```

### Merging Styles
```tsx
// Combine pre-built styles with custom properties
style={mergeStyles(STYLES.card, { marginTop: SPACING.lg })}
style={mergeStyles(STYLES.buttonPrimary, { width: "100%" })}
```

## Tools & Tips

### Find Remaining Color Values
Search for these patterns in the codebase:
- `#0d1c2e` - Primary text
- `#4a4455` - Secondary text
- `#f8f9ff` - Background
- `#ffffff` - Surface/Cards
- `#7c3aed` - Purple
- `#16a34a` - Green
- `#e11d48` - Red
- `#cbd5e1` - Borders

Use: `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac) to find all occurrences

### Font Sizes
Replace hardcoded font sizes with design system:
- 12px → `TYPOGRAPHY.labelSm.fontSize`
- 14px → `TYPOGRAPHY.labelMd.fontSize`
- 16px → `TYPOGRAPHY.bodyMd.fontSize`
- 18px → `TYPOGRAPHY.bodyLg.fontSize`
- 24px → `TYPOGRAPHY.headlineMd.fontSize`
- 32px → `TYPOGRAPHY.headlineLg.fontSize`
- 48px → `TYPOGRAPHY.display.fontSize`

## Verification Checklist After Update

- [ ] No hardcoded hex color codes (except in images/logos)
- [ ] All spacing uses SPACING constants
- [ ] All border radius uses BORDER_RADIUS constants
- [ ] Typography uses TYPOGRAPHY or STYLES
- [ ] Buttons are pill-shaped (#7c3aed background, 9999px radius)
- [ ] Cards have soft shadow (0 1px 6px rgba(0,0,0,0.06))
- [ ] Page background is #f8f9ff (COLORS.background)
- [ ] Text contrast is maintained (AA+ WCAG compliance)

## Summary

**Pattern**: Each page follows this structure:
1. Import design system tokens
2. Replace all hardcoded colors with COLORS.*
3. Replace all hardcoded spacing with SPACING.*
4. Use pre-built STYLES.* objects where possible
5. Use mergeStyles() to combine styles when needed

**Benefit**: All pages now have:
- ✅ Consistent colors (brand purple, functional green/red)
- ✅ Consistent spacing (4px base unit system)
- ✅ Consistent typography (Hanken Grotesk)
- ✅ Consistent shadows (soft elevation)
- ✅ Easy to maintain (update design tokens once, applies everywhere)

---

**Total Pages**: 15 remaining  
**Estimated Time Per Page**: 5-10 minutes  
**Total Estimated Time**: ~90 minutes for complete migration  

Once these pages are updated, the entire SplitEase web app will have a cohesive, professional design system implementation! 🎨
