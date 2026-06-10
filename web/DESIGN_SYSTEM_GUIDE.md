# SplitEase Design System Implementation Guide

## Overview

All UI styling uses a centralized design system defined in `/lib/designSystem.ts`. This ensures consistency across the entire application and makes updates easy.

## Quick Start

### 1. Import the Design System

```tsx
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, STYLES, mergeStyles } from "@/lib/designSystem";
```

### 2. Use Design Tokens

Instead of hardcoding colors, spacing, etc., use the imported constants:

```tsx
// ❌ DON'T - hardcoded values
<div style={{ color: "#0d1c2e", padding: "16px", borderRadius: "12px" }}>Content</div>

// ✅ DO - use design tokens
<div style={{ color: COLORS.onSurface, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg }}>Content</div>
```

## Common Patterns

### Page Background

```tsx
<div style={STYLES.pageBackground}>
  {/* Content */}
</div>
```

### Navigation Bar

```tsx
<nav style={STYLES.navBar}>
  {/* Nav items */}
</nav>
```

### Cards

```tsx
// Standard card (12px radius, soft shadow)
<div style={STYLES.card}>
  {/* Card content */}
</div>

// Large card (16px radius, medium shadow)
<div style={STYLES.cardLarge}>
  {/* Card content */}
</div>
```

### Buttons

```tsx
// Primary button (pill-shaped, purple background)
<button style={STYLES.buttonPrimary}>Sign In</button>

// Secondary button (outline style)
<button style={STYLES.buttonSecondary}>Cancel</button>
```

### Form Elements

```tsx
// Input field
<input 
  type="email" 
  placeholder="name@example.com"
  style={STYLES.input}
/>

// Label
<label style={STYLES.label}>Email Address</label>
```

### Typography

```tsx
// Large heading
<h1 style={STYLES.headingLg}>Welcome to SplitEase</h1>

// Medium heading
<h2 style={STYLES.headingMd}>Create Account</h2>

// Body text
<p style={STYLES.bodyText}>Your content here</p>

// Secondary text
<p style={STYLES.secondaryText}>Secondary information</p>
```

### Badges & Status

```tsx
// Success badge (green)
<span style={STYLES.badgeSuccess}>You are owed $50</span>

// Error badge (red)
<span style={STYLES.badgeError}>You owe $25</span>
```

## Design System Values

### Colors

- **Primary**: `COLORS.primary` (#630ed4)
- **Primary Container**: `COLORS.primaryContainer` (#7c3aed) - for buttons
- **Background**: `COLORS.background` (#f8f9ff)
- **Surface**: `COLORS.surface` (#ffffff) - cards
- **Text Primary**: `COLORS.onSurface` (#0d1c2e)
- **Text Secondary**: `COLORS.onSurfaceVariant` (#4a4455)
- **Success/Green**: `COLORS.success` (#16a34a) - "owed to you"
- **Error/Red**: `COLORS.error` (#e11d48) - "you owe"
- **Borders**: `COLORS.outline` (#cbd5e1)

### Spacing (4px base unit)

- `SPACING.xs` = 4px
- `SPACING.sm` = 8px
- `SPACING.md` = 16px (internal padding)
- `SPACING.lg` = 24px (section gaps)
- `SPACING.xl` = 48px

### Border Radius

- `BORDER_RADIUS.lg` = 12px (cards, inputs)
- `BORDER_RADIUS.xl` = 16px (large containers)
- `BORDER_RADIUS.full` = 9999px (pill buttons)

### Shadows

- `SHADOWS.sm` = subtle (cards)
- `SHADOWS.md` = medium (modals)
- `SHADOWS.lg` = strong elevation

### Typography

- Font: `TYPOGRAPHY.fontFamily` = "Hanken Grotesk"
- Display: 48px, weight 900
- Headline Large: 32px, weight 900
- Headline Medium: 24px, weight 800
- Body Large: 18px, weight 600
- Body Medium: 16px, weight 500
- Label Medium: 14px, weight 700
- Label Small: 12px, weight 600

## Merging Styles

Use `mergeStyles()` to combine multiple style objects:

```tsx
<div style={mergeStyles(STYLES.card, { marginTop: SPACING.lg })}>
  {/* Merges card style with custom margin */}
</div>
```

## Helper Functions

### `space(multiplier)`
Creates spacing values based on 4px base:
```tsx
padding: space(2) // = "8px"
gap: space(4)     // = "16px"
```

### `rgba(color, opacity)`
Creates rgba values from hex colors:
```tsx
backgroundColor: rgba(COLORS.primary, 0.1) // semi-transparent purple
```

## Pages Updated

- ✅ `/app/auth/signin/page.tsx` - Sign-in form
- 🔄 **Remaining pages in progress**

## Updating a Page

### Step 1: Add imports
```tsx
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, STYLES } from "@/lib/designSystem";
```

### Step 2: Replace inline styles
Search and replace hardcoded values with design tokens:
- Colors → `COLORS.*`
- Spacing → `SPACING.*`
- Borders → `BORDER_RADIUS.*`
- Shadows → `SHADOWS.*`

### Step 3: Use pre-built STYLES
Use `STYLES.card`, `STYLES.buttonPrimary`, etc. for complex components.

### Step 4: Test for consistency
Verify that the page matches the design system in Stitch (purple buttons, correct spacing, proper shadows, etc.)

## Example: Full Sign-Up Form

```tsx
"use client";

import { useState } from "react";
import { COLORS, SPACING, STYLES } from "@/lib/designSystem";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div style={STYLES.pageBackground}>
      <nav style={STYLES.navBar}>
        {/* Navigation */}
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: SPACING.lg }}>
        <div style={STYLES.cardLarge}>
          <h1 style={STYLES.headingLg}>Create Account</h1>
          
          <label style={STYLES.label}>Email</label>
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={STYLES.input}
          />

          <label style={STYLES.label}>Password</label>
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={STYLES.input}
          />

          <button style={STYLES.buttonPrimary}>Sign Up</button>
        </div>
      </div>
    </div>
  );
}
```

## Benefits

✅ **Consistency**: All pages use the same colors, spacing, typography  
✅ **Maintainability**: Update design tokens once, applies everywhere  
✅ **Scalability**: Easy to add new pages using the same system  
✅ **Accessibility**: Follows design system color contrast requirements  
✅ **Performance**: Reduced bundle size with reusable style objects  

## Questions?

Refer to `/lib/designSystem.ts` for the complete list of available tokens and styles.
