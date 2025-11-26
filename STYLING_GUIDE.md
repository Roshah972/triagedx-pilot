# Professional Medical App Styling Guide

This document outlines the styling standards for TRIAGEDX, ensuring a professional, accessible, and consistent medical application interface.

## Design System Overview

TRIAGEDX uses a comprehensive design system based on professional medical app best practices, emphasizing:
- **Consistency**: Unified spacing, colors, typography
- **Accessibility**: WCAG AA minimum, focus indicators, reduced motion
- **Calm aesthetic**: Soft colors, generous spacing, subtle effects
- **High contrast**: Clinical elements readable at 80% zoom
- **Modern fonts**: Sans-serif for UI, monospace for data

## 1. Font System

### Primary Fonts
- **UI Font**: Inter (via Google Fonts with `display=swap`)
- **Monospace**: Monaco, Courier New, Consolas, Menlo
- **Fallback**: System UI stack (San Francisco, Segoe UI, etc.)

### Implementation
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', ...;
--font-mono: 'Monaco', 'Courier New', 'Consolas', 'Menlo', monospace;
```

## 2. Color Palette

### Primary Palette (Calm Violet/Purple)
- Primary: `#5833ff`
- Secondary: `#6B46FF`
- Tertiary: `#BE99FF`
- Accent: `#ff8ce0`

### Neutral Colors
- Background: `#ffffff`
- Foreground: `#1a1a1a`
- Muted: `#f3f4f6`
- Muted Foreground: `#6b7280`
- Border: `#e5e7eb`

### Status Colors
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Amber)
- Error: `#ef4444` (Red)
- Info: `#3b82f6` (Blue)

### Clinical Severity Scale (High Contrast)
- Critical: `#DC2626` (Red-600)
- Urgent: `#EA580C` (Orange-600)
- Moderate: `#D97706` (Amber-600)
- Stable: `#2563EB` (Blue-600)
- Routine: `#059669` (Emerald-600)

## 3. Typography Scale

### Font Sizes
```css
--text-xs: 0.75rem;      /* 12px - captions */
--text-sm: 0.875rem;     /* 14px - secondary text */
--text-base: 1rem;       /* 16px - body text */
--text-lg: 1.125rem;     /* 18px - emphasized text */
--text-xl: 1.25rem;      /* 20px - small headings */
--text-2xl: 1.5rem;      /* 24px - section headings */
--text-3xl: 1.875rem;    /* 30px - page titles */
--text-4xl: 2.25rem;     /* 36px - hero titles */
```

### Line Heights
- None: `1`
- Tight: `1.25`
- Normal: `1.5`
- Relaxed: `1.75`

### Font Weights
- Normal: `400`
- Medium: `500`
- Semibold: `600`
- Bold: `700`

## 4. Spacing System

All spacing uses multiples of 4px for consistency:

```css
--space-1: 0.25rem;      /* 4px */
--space-2: 0.5rem;       /* 8px */
--space-3: 0.75rem;      /* 12px */
--space-4: 1rem;         /* 16px */
--space-6: 1.5rem;       /* 24px */
--space-8: 2rem;         /* 32px */
--space-12: 3rem;        /* 48px */
--space-16: 4rem;        /* 64px */
```

### Usage Patterns
- Cards: `padding: var(--space-6)` (24px)
- Forms: `gap: var(--space-4)` (16px between fields)
- Sections: `padding: var(--space-8)` (32px vertical)
- Containers: `padding: var(--space-4) var(--space-6)` (16px horizontal, 24px vertical)

## 5. Border Radius System

```css
--radius-sm: 0.25rem;    /* 4px - small elements */
--radius-md: 0.375rem;   /* 6px - buttons, inputs */
--radius-lg: 0.5rem;     /* 8px - cards */
--radius-xl: 0.625rem;   /* 10px - large cards */
--radius-2xl: 1rem;      /* 16px - hero sections */
```

## 6. Shadows and Depth

Subtle shadows for visual hierarchy:

```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

### Usage
- Cards: `box-shadow: var(--shadow-sm)`
- Buttons: `box-shadow: var(--shadow-xs)` (hover: `var(--shadow-sm)`)
- Modals: `box-shadow: var(--shadow-xl)`

## 7. Component Patterns

### Cards
```css
.card {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
}
```

### Buttons
```css
.button {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition: all 0.2s ease;
  box-shadow: var(--shadow-xs);
}

.button:hover {
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}
```

### Inputs
```css
.input {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  min-height: 44px; /* Touch target */
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--ring);
  box-shadow: 0 0 0 3px rgba(88, 51, 255, 0.1);
}
```

### Badges/Tags
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  background: var(--muted);
  color: var(--muted-foreground);
}
```

## 8. Accessibility Requirements

### Focus Indicators
```css
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  border-radius: 2px;
}

@media (prefers-contrast: high) {
  *:focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 3px;
  }
}
```

### Color Contrast
- Text: Minimum 4.5:1 (WCAG AA)
- Large text: Minimum 3:1
- Interactive elements: Minimum 3:1
- High-contrast mode: 7:1 (WCAG AAA)

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Touch Targets
- Minimum size: 44x44px (iOS) / 48x48px (Android)
- Adequate spacing between interactive elements

## 9. Responsive Design

### Breakpoints
```css
/* Mobile first approach */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

### Patterns
- Mobile-first CSS
- Flexible grid layouts
- Responsive typography
- Touch-friendly controls on mobile

## 10. Animation and Transitions

### Standard Transitions
```css
/* Standard transition */
transition: all 0.2s ease-in-out;

/* Color transitions */
transition: color 0.15s, background-color 0.15s;

/* Transform transitions */
transition: transform 0.2s;
```

### Hover States
- Subtle elevation: `transform: translateY(-1px)`
- Shadow increase: `box-shadow: var(--shadow-sm)`
- Color transitions: Smooth color changes

## 11. Print Styling

```css
@media print {
  * {
    background: white !important;
    color: black !important;
  }
  
  body {
    font-family: 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.4;
  }
  
  .no-print {
    display: none !important;
  }
}
```

## 12. Quality Checklist

### Visual Consistency
- [x] Consistent spacing (4px/8px multiples)
- [x] Unified border radius scale
- [x] Consistent shadow usage
- [x] Color palette applied consistently
- [x] Typography scale used throughout

### Accessibility
- [x] All interactive elements have focus indicators
- [x] Color contrast meets WCAG AA minimum
- [x] Reduced motion respected
- [x] Touch targets meet minimum sizes
- [x] ARIA labels on icons and images

### Performance
- [x] Fonts loaded with `display: swap`
- [x] CSS variables for theming
- [x] Minimal animations
- [x] Optimized images

### Professional Polish
- [x] Smooth transitions on interactions
- [x] Consistent hover states
- [x] Clear visual hierarchy
- [x] Generous whitespace
- [x] No visual clutter

## Implementation Status

✅ **Completed:**
- Design system variables in `globals.css`
- Font system (Inter with fallbacks)
- Color palette (violet/purple primary)
- Typography scale
- Spacing system
- Border radius system
- Shadow system
- Accessibility features (focus indicators, reduced motion)
- Print styling
- Dark theme structure (ready for implementation)

🔄 **In Progress:**
- Applying consistent patterns across all components
- Standardizing button styles
- Standardizing input styles
- Standardizing card styles

## Usage Examples

### Creating a New Component

```tsx
// Use design system variables
import styles from './Component.module.css'

export function Component() {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Title</h2>
      <p className={styles.description}>Description</p>
      <button className={styles.button}>Action</button>
    </div>
  )
}
```

```css
/* Component.module.css */
.card {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
}

.title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--foreground);
  margin-bottom: var(--space-4);
}

.description {
  font-size: var(--text-base);
  color: var(--muted-foreground);
  line-height: var(--leading-normal);
  margin-bottom: var(--space-6);
}

.button {
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-xs);
}

.button:hover {
  background: var(--color-secondary);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.button:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Inter Font](https://rsms.me/inter/)
- [CSS Variables Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

---

**Last Updated**: Based on professional medical app styling guide standards
**Maintained By**: TRIAGEDX Development Team

