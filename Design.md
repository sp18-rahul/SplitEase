---
name: SplitEase Narrative
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#4a4455'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#7b7487'
  outline-variant: '#ccc3d8'
  surface-tint: '#732ee4'
  primary: '#630ed4'
  on-primary: '#ffffff'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#d2bbff'
  secondary: '#712edd'
  on-secondary: '#ffffff'
  secondary-container: '#8b4ef7'
  on-secondary-container: '#fffbff'
  tertiary: '#4f4d5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#676577'
  on-tertiary-container: '#e7e4f8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#ebddff'
  secondary-fixed-dim: '#d3bbff'
  on-secondary-fixed: '#250059'
  on-secondary-fixed-variant: '#5b00c5'
  tertiary-fixed: '#e4e0f5'
  tertiary-fixed-dim: '#c7c4d8'
  on-tertiary-fixed: '#1b1a29'
  on-tertiary-fixed-variant: '#464555'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '900'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '900'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '900'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-max: 1280px
  gutter: 20px
---

## Brand & Style
The design system is built on the principles of **Modern Reliability**. It targets a demographic that values speed and clarity in financial transactions—friends, roommates, and travelers who need to resolve debts without social friction. 

The visual style is **Corporate Modern with a Friendly Edge**. It leverages a high-contrast color palette to ensure financial data is unmistakable, while utilizing soft, generous geometry to keep the emotional tone approachable and non-intimidating. The interface relies on clean execution, purposeful whitespace, and a sophisticated purple-centric identity to differentiate itself from traditional, sterile banking apps.

## Colors
The palette is dominated by **Vivid Violet**, used to signify primary actions and the brand's core identity. 

- **Primary & Secondary Purple:** Used for buttons, active navigation states, and branding elements.
- **Functional Green/Red:** Crucial for immediate cognitive processing of debt. Green always represents money coming in ("owed"), while Red represents money going out ("owes").
- **Neutral Grays:** We use a deep Slate (#0F172A) for maximum text legibility and a light off-white (#F8FAFC) for the canvas to reduce eye strain.
- **Focus States:** High-saturation purple glows are used to indicate interactivity.

## Typography
This design system utilizes **Hanken Grotesk** across all roles to maintain a cohesive, high-performance feel. 

- **Weight Strategy:** Headlines are set at a heavy 900 weight to provide strong anchors for the layout. Body text never drops below 500 weight to ensure maximum readability against various background tints.
- **Scale:** A tight scale is used for body text, while display sizes are aggressive to emphasize total balances and primary calls to action.
- **Hierarchy:** Labels and metadata use increased tracking and bold weights to distinguish them from editorial body content.

## Layout & Spacing
The system follows a **Fixed-Fluid Hybrid** model.
- **Desktop:** A 12-column grid with a 1280px max-width container. Navigation is handled via a fixed 280px left sidebar.
- **Mobile:** A single-column fluid layout with 16px side margins. Navigation shifts to a bottom bar or a simplified top header with a drawer.
- **Spacing Rhythm:** All spacing is based on a 4px baseline. Components primarily use 16px (md) for internal padding and 24px (lg) for section separation to maintain an airy, modern feel.

## Elevation & Depth
Depth is achieved through **Soft Layering** rather than dramatic shadows.
- **Level 1 (Cards/Surface):** Use a very subtle shadow: `0 1px 6px rgba(0,0,0,0.06)`. This lifts the element just enough to separate it from the #F8FAFC background.
- **Level 2 (Modals/Overlays):** Use a medium shadow: `0 10px 25px -5px rgba(0,0,0,0.1)`.
- **Level 3 (Dropdowns/Tooltips):** Use a crisp, small shadow with a 1px border of #EDE9FE.
- **Interactions:** Buttons shift slightly in Y-axis or deepen in shadow on hover to provide tactile feedback.

## Shapes
The shape language is **Generous and Friendly**. 
- **Standard Radius:** 12px for standard cards and input fields.
- **Large Radius:** 16px for primary containers and large modal surfaces.
- **Pill:** Used exclusively for status badges (e.g., "Settled", "Pending") and main action buttons to maximize their clickability affordance.

## Components

### Navigation
- **Sidebar:** Dark Slate background (#0F172A) with Purple icons. Active states use a left-edge 4px border in Primary Purple.
- **Header:** Transparent or white with a subtle bottom border. Contains breadcrumbs and user profile.

### Cards
- **Expense Card:** Horizontal layout. Title and date on the left; balance and "you owe/owed" status on the right.
- **Group Card:** Uses a 16px radius. Includes a "Member Stack" (overlapping avatars) in the bottom left.
- **Balance Card:** Large-format display using #7C3AED for the container or text to emphasize the net total.

### Forms
- **Inputs:** 12px radius, 1px border in #CBD5E1. 
- **Focus State:** 2px solid #7C3AED with a soft 4px purple outer glow.
- **Submit Buttons:** Pill-shaped, Primary Purple background, White text, 900 weight.

### Badges & Status
- **Positive Status:** Green text (#16A34A) on Green tint (#DCFCE7). Pill-shaped.
- **Negative Status:** Red text (#E11D48) on Red tint (#FEE2E2). Pill-shaped.

### Activity Feed
- **Items:** Separated by thin #F1F5F9 borders. Use circular icons with high-contrast glyphs to denote the type of activity (Payment, New Expense, Comment).