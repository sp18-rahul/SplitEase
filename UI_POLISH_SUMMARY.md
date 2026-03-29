# UI Polish — Designer Pass (Round 3) ✅ Complete

## Summary
Applied comprehensive designer-level polish addressing text overflow, alignment, color tokens, spacing, and navigation issues across all dashboard screens.

---

## Changes by File

### 1. web/app/globals.css — Foundation
- ✅ Removed `overflow: hidden` from `.card` and `.card-static` → Hover edit/delete buttons now visible
- ✅ Reduced `.card:hover` lift: `translateY(-0.5rem)` → `translateY(-2px)` → Prevents aggressive reflow
- ✅ Added `border-radius: 0.875rem` to `.btn-primary`, `.btn-secondary`, `.btn-danger` → Buttons now have consistent rounded corners
- ✅ Scoped global `p { color }` to `.app-shell p` only → Dark cards (summary-card) retain proper text color
- ✅ Added `.section-header` class → Uniform icon+text alignment in all section headings
- ✅ Added `.nav-bottom` and `.nav-bottom-item` classes with iOS safe-area support → Proper bottom navigation layout
- ✅ Added `.filter-tab` and `.filter-tab-active` pill styles → Compact filter tabs instead of oversized buttons
- ✅ Added `.section-gap` utility (2rem spacing) → Uniform 32px gaps between page sections

### 2. app/page.tsx — Dashboard
- ✅ Fixed broken router import → Removed `import router from "next/router"`
- ✅ Rebuilt bottom navigation → Only 2 items: Home + New Group (removed dead tabs: Groups, Activity, Profile)
- ✅ Added `truncate` to group name → Prevents text overflow on long names
- ✅ Removed duplicate `space-y-2` wrapper → Cleaned up nested spacing conflicts
- ✅ Replaced oversized filter buttons with `.filter-tab` pills → Compact, professional appearance
- ✅ Fixed emoji placement → Moved emoji outside gradient clip: `Hi there 👋` → `👋 Hi there`
- ✅ Standardized spacing with `section-gap` → Applied at header, groups section, and activity feed
- ✅ Fixed max-w-80rem → Changed to valid `max-w-[80rem]` Tailwind class
- ✅ Fixed balance card background colors → Proper light/dark contrast for settled/owed/owing states

### 3. app/groups/[id]/page.tsx — Group Details
- ✅ Fixed `app-card` → `card card-lg` → Proper glassmorphic styling
- ✅ Restructured header → "Add Expense" button now on same row, properly positioned
- ✅ Replaced back button style → Changed from `btn-secondary` to `btn-ghost` (compact icon-only)
- ✅ Added `Receipt` icon to "Recent Bills" → Consistent with other section headings
- ✅ Applied `.section-header` to all `<h2>` headings → Uniform icon+text centering across page
- ✅ Fixed balance row colors → `emerald-*` → `success-*`, `rose-*` → `danger-*`, `slate-*` → `neutral-*`
- ✅ Fixed settlement cards → Changed to `card card-sm` for glassmorphic look
- ✅ Fixed settlement layout → Arrow now inline between payer and receiver (flex-row instead of flex-col)
- ✅ Fixed expense card width → `w-3/5` → `flex-1 min-w-0` (responsive, no clipping)
- ✅ Fixed date text size → `text-[11px]` → `text-xs` (within design system)
- ✅ Removed "All time" button → Was a false affordance with no handler
- ✅ Replaced member orbit center `+` → Users icon component
- ✅ Global color token updates → Systematic replacement of raw colors with design tokens

### 4. app/groups/new/page.tsx — Create Group
- ✅ Fixed user card unselected state → `border-slate-100` → `border-neutral-100`, `bg-white` maintained
- ✅ Fixed checkbox colors → `border-slate-300` → `border-neutral-300`, `bg-slate-50` → `bg-neutral-50`
- ✅ Fixed focus ring color → `focus:ring-indigo-500/30` → `focus:ring-primary-500/30`
- ✅ Fixed shadow color → `shadow-indigo-100` → `shadow-primary-100`
- ✅ Replaced "Add New Member" bespoke gradient → Now uses `.card card-static` for consistency

---

## Verification Checklist
- ✅ Bottom nav: exactly 2 links (Home + New Group) + FAB, zero dead buttons
- ✅ Group name in dashboard card: truncates cleanly with ellipsis
- ✅ All section headers: icon and text perfectly vertically aligned
- ✅ Balance rows: colored correctly using success-*/danger-*/neutral-* tokens
- ✅ Settlement: arrow inline between payer → receiver names
- ✅ Expense cards: hover buttons visible (no overflow clipping)
- ✅ Filter tabs: compact pill size, not full button height
- ✅ Uniform 32px gaps between all page sections via `.section-gap`
- ✅ Zero raw `slate-*`, `indigo-*`, `emerald-*`, `rose-*` token references
- ✅ No TypeScript errors introduced (pre-existing NextAuth session type issue)

---

## Impact
- **Visual Consistency**: All screens now follow the glassmorphism design system
- **User Experience**: Cleaner navigation, no false affordances, proper visual hierarchy
- **Responsive**: Fixed width issues, proper truncation, iOS safe-area support
- **Maintainability**: Centralized design tokens, reusable utility classes
