---
name: AgentCart Technical Premium
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#38393a'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#292a2a'
  surface-container-highest: '#343535'
  on-surface: '#e3e2e2'
  on-surface-variant: '#c3c5d9'
  inverse-surface: '#e3e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#8d90a2'
  outline-variant: '#434656'
  surface-tint: '#b7c4ff'
  primary: '#b7c4ff'
  on-primary: '#002682'
  primary-container: '#0052ff'
  on-primary-container: '#dfe3ff'
  inverse-primary: '#004ced'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#905a00'
  on-tertiary-container: '#ffdfbe'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001452'
  on-primary-fixed-variant: '#0038b6'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#121414'
  on-background: '#e3e2e2'
  surface-variant: '#343535'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0px
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  code-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

This design system embodies a high-performance, precision-engineered aesthetic tailored for the intersection of Fintech and AI. The visual language is rooted in **Modern Minimalism** with a focus on functional elegance—frequently referred to as the "Linear/Stripe" style. 

The target audience consists of sophisticated financial operators and developers who value speed, clarity, and reliability. The UI should evoke a sense of calm authority through a restrained color palette, crisp borders, and an expansive use of negative space. Visual hierarchy is established through meticulous typography and subtle tonal shifts rather than loud decorative elements.

**Key Stylistic Pillars:**
- **Reductionist:** If an element doesn't serve a functional purpose, it is removed.
- **Precision:** Alignment to a strict grid and the use of thin, purposeful borders.
- **Atmospheric Depth:** Using "dark-on-dark" layering to create a sense of focus and premium quality.

## Colors

The palette is optimized for long-session endurance in dark environments. 

- **The Void (#0a0a0a):** The base layer, providing a deep, non-distracting canvas.
- **Electric Blue (#0052ff):** Used exclusively for primary actions, active states, and critical data points. It is the "light" in the interface.
- **Monochrome Hierarchy:** Pure white is reserved for high-contrast headlines. Muted gray (#a3a3a3) handles 80% of the UI text to reduce eye strain.
- **Semantic Accents:** Emerald Green and Amber are used for status indicators (Success/Warning) but should be applied with restraint—typically as small indicators or text-only states rather than large blocks of color.

## Typography

The system utilizes **Inter** for its incredible legibility and neutral, professional character. For technical data and labels, **Geist** is introduced to provide a subtle "developer-centric" feel.

**Application Rules:**
- **Tracking:** Headlines use negative letter spacing to feel tighter and more "editorial." Body text and labels use slightly increased tracking to ensure readability against the dark background.
- **Contrast:** Always ensure secondary text (#a3a3a3) meets accessibility standards against the charcoal containers.
- **Scale:** Maintain generous vertical rhythm. Use larger line heights for body copy (1.6x) to create an airy, premium feel despite the dark theme.

## Layout & Spacing

This design system follows a strict **8px spacing scale**. Layouts should be structured around a 12-column grid for desktop and a single column for mobile.

- **Whitespace as a Divider:** Avoid using lines wherever possible. Use spacing (40px+) to separate distinct content blocks.
- **Alignment:** All elements must snap to the 8px grid. Icons should be centered within 20px or 24px bounding boxes to maintain visual balance.
- **Margins:** Desktop views should maintain a minimum side margin of 40px, while mobile views use 16px.

## Elevation & Depth

Depth is achieved through **Tonal Layering** rather than traditional drop shadows.

- **Level 0 (Base):** #0a0a0a. Used for the main background.
- **Level 1 (Card/Section):** #171717. Elevated slightly. These containers should have a 1px solid border of #262626.
- **Level 2 (Popovers/Modals):** #1c1c1c. These are the highest surface and should feature a soft, deep shadow (0px 20px 40px rgba(0,0,0,0.5)) to separate them from the interface.
- **Borders:** Every interactive container must have a thin, 1px border (#262626). This defines the shape in a low-light environment where shadows might get lost.

## Shapes

The design system utilizes a **"Round Eight"** philosophy (0.5rem / 8px) for all primary components. This provides a modern, friendly feel without sacrificing the professional, architectural structure of the layout.

- **Buttons & Inputs:** 8px (rounded-md).
- **Cards & Modals:** 12px or 16px (rounded-lg) for larger containers to create a nested hierarchy.
- **Badges/Chips:** Full pill-shaped (rounded-full) to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Background #0052ff, Text #ffffff. No border. On hover, a subtle brightness increase.
- **Secondary:** Background transparent, Border 1px #262626, Text #ffffff.
- **Ghost:** Background transparent, Text #a3a3a3. Hover state shifts text to #ffffff.

### Input Fields
- **Default:** Background #171717, Border 1px #262626, Text #ffffff. 
- **Focus:** Border color shifts to #0052ff with a subtle outer glow (0px 0px 0px 2px rgba(0, 82, 255, 0.2)).
- **Placeholder:** Text color #525252.

### Cards
- Standard containers use #171717 background with a 1px #262626 border. 
- Padding should be generous, typically 24px (lg spacing) on all sides.

### Data Tables
- Header row: Text #a3a3a3, Label-caps style.
- Row divider: 1px solid #262626. 
- Hover state: Row background shifts to #1c1c1c.

### Chips & Status
- Small, uppercase Geist font.
- Status dots (4px circle) used next to text instead of heavy background fills.