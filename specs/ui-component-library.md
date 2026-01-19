# UI Component Library - shadcn/ui + Tailwind CSS v4

**Status:** Accepted
**Date:** 2026-01-19
**Updated:** 2026-01-19 (Tailwind CSS v4 migration)

---

## Overview

This spec defines the UI component library approach for the ANSA MES frontend. We use **shadcn/ui** with **Tailwind CSS v4** to build a consistent, accessible, and easily refactorable user interface for shop floor workers.

### Why shadcn/ui?

1. **You own the code** - Components are copied into your codebase, not imported from node_modules
2. **Easy to refactor** - Client changes = edit your files directly, no library fighting
3. **Accessible** - Built on Radix UI primitives with proper ARIA support
4. **Lightweight** - Only include components you use
5. **Tailwind-based** - Utility classes for rapid iteration

### Why Tailwind CSS v4?

1. **CSS-first configuration** - No more JavaScript config files, configure directly in CSS
2. **3.78x faster builds** - New engine with significant performance improvements
3. **OKLCH color space** - Wider gamut colors for better visual consistency
4. **Native container queries** - No plugin needed
5. **Zero-configuration content detection** - Automatic source file detection
6. **Vite plugin** - First-class Vite support with `@tailwindcss/vite`

---

## Browser Requirements

Tailwind CSS v4 requires modern browsers:
- **Safari 16.4+**
- **Chrome 111+**
- **Firefox 128+**

This is acceptable for our factory environment where we control the browser versions.

---

## Design Principles

### Shop Floor Readability

Workers use desktop monitors in a factory environment. Prioritize:

- **High contrast** - Dark text on light backgrounds
- **Large text** - Minimum 16px base, larger for important info
- **Clear buttons** - Obvious clickable areas with good padding
- **Status colors** - Green (good), Red (error/danger), Yellow (warning), Blue (info)
- **Simple layouts** - No cluttered interfaces

### Accessibility

- All interactive elements keyboard accessible
- Focus indicators visible
- ARIA labels on icons/buttons
- Color not the only indicator (use icons + text)

---

## Tailwind CSS v4 Configuration

### CSS-First Setup (No tailwind.config.js!)

In Tailwind v4, configuration is done directly in CSS using the `@theme` directive. **No JavaScript config file needed.**

```css
/* apps/web/src/styles/globals.css */
@import "tailwindcss";

/* Custom theme configuration */
@theme {
  /* Semantic colors for factory UI (OKLCH color space) */
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.141 0.005 285.823);

  --color-card: oklch(1 0 0);
  --color-card-foreground: oklch(0.141 0.005 285.823);

  --color-popover: oklch(1 0 0);
  --color-popover-foreground: oklch(0.141 0.005 285.823);

  --color-primary: oklch(0.623 0.214 259.815);
  --color-primary-foreground: oklch(0.985 0 0);

  --color-secondary: oklch(0.967 0.001 286.375);
  --color-secondary-foreground: oklch(0.21 0.006 285.885);

  --color-muted: oklch(0.967 0.001 286.375);
  --color-muted-foreground: oklch(0.552 0.016 285.938);

  --color-accent: oklch(0.967 0.001 286.375);
  --color-accent-foreground: oklch(0.21 0.006 285.885);

  --color-destructive: oklch(0.577 0.245 27.325);
  --color-destructive-foreground: oklch(0.985 0 0);

  --color-border: oklch(0.92 0.004 286.32);
  --color-input: oklch(0.92 0.004 286.32);
  --color-ring: oklch(0.623 0.214 259.815);

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

### Why OKLCH Instead of HSL?

Tailwind v4 uses **OKLCH** (Oklch Lightness Chroma Hue) color space:

| Feature | HSL (v3) | OKLCH (v4) |
|---------|----------|------------|
| Perceptual uniformity | No | Yes |
| Gamut | sRGB only | P3 + wide gamut |
| Lightness consistency | Varies by hue | Consistent across hues |
| Browser support | Universal | Modern browsers |

**Converting HSL to OKLCH:**
```
HSL: hsl(221.2 83.2% 53.3%)  →  OKLCH: oklch(0.623 0.214 259.815)
HSL: hsl(0 84.2% 60.2%)      →  OKLCH: oklch(0.577 0.245 27.325)
```

Use online converters or the browser DevTools color picker to convert values.

### Dark Mode Support

```css
/* apps/web/src/styles/globals.css */
@import "tailwindcss";

@theme {
  /* Light theme values... */
}

/* Dark theme using CSS custom properties */
.dark {
  --color-background: oklch(0.141 0.005 285.823);
  --color-foreground: oklch(0.985 0 0);
  --color-card: oklch(0.21 0.006 285.885);
  --color-card-foreground: oklch(0.985 0 0);
  /* ... other dark values */
}
```

---

## Deprecated & Renamed Utilities (v3 → v4 Migration)

### Removed Utilities

These utilities were deprecated in v3 and removed in v4:

| Deprecated (v3) | Replacement (v4) |
|-----------------|------------------|
| `bg-opacity-*` | `bg-black/50` (opacity modifier) |
| `text-opacity-*` | `text-black/50` (opacity modifier) |
| `border-opacity-*` | `border-black/50` (opacity modifier) |
| `divide-opacity-*` | `divide-black/50` (opacity modifier) |
| `ring-opacity-*` | `ring-black/50` (opacity modifier) |
| `placeholder-opacity-*` | `placeholder-black/50` (opacity modifier) |
| `flex-shrink-*` | `shrink-*` |
| `flex-grow-*` | `grow-*` |
| `overflow-ellipsis` | `text-ellipsis` |
| `decoration-slice` | `box-decoration-slice` |
| `decoration-clone` | `box-decoration-clone` |

### Renamed Utilities

| v3 | v4 | Notes |
|----|-----|-------|
| `shadow-sm` | `shadow-xs` | Scale shifted |
| `shadow` | `shadow-sm` | Scale shifted |
| `drop-shadow-sm` | `drop-shadow-xs` | Scale shifted |
| `drop-shadow` | `drop-shadow-sm` | Scale shifted |
| `blur-sm` | `blur-xs` | Scale shifted |
| `blur` | `blur-sm` | Scale shifted |
| `rounded-sm` | `rounded-xs` | Scale shifted |
| `rounded` | `rounded-sm` | Scale shifted |
| `outline-none` | `outline-hidden` | `outline-none` now sets `outline-style: none` |
| `ring` | `ring-3` | Default ring width changed to 1px |

### Other Breaking Changes

| Change | v3 Behavior | v4 Behavior | Migration |
|--------|-------------|-------------|-----------|
| Default border color | `gray-200` | `currentColor` | Add explicit `border-gray-200` |
| Default ring width | `3px` | `1px` | Use `ring-3` for 3px rings |
| `@tailwind` directives | Required | Removed | Use `@import "tailwindcss"` |
| Transform reset | `transform-none` | N/A | Use `scale-none`, `rotate-none` individually |

---

## Component Library

### Core Components (from shadcn/ui)

| Component | Purpose | Used In |
|-----------|---------|---------|
| `Button` | Actions, form submits | Everywhere |
| `Input` | Text entry | Forms, search |
| `Label` | Form field labels | Forms |
| `Card` | Content containers | Work orders, team |
| `Table` | Data display | Work order list, pick list |
| `Dialog` | Modal dialogs | Break reason, production entry |
| `Select` | Dropdowns | Filters, station select |
| `Badge` | Status indicators | Work order status |
| `Spinner` | Loading states | Data fetching |
| `Separator` | Visual dividers | Sections |
| `Tabs` | Tab navigation | Work order detail |
| `Alert` | Messages/warnings | Errors, confirmations |

### Additional Components (for later phases)

| Component | Purpose | Phase |
|-----------|---------|-------|
| `Calendar` | Date picker | Phase 18 |
| `Dropdown Menu` | Action menus | As needed |
| `Toast` | Notifications | As needed |
| `Command` | Search/command palette | Future |

---

## File Structure

```
apps/web/src/
├── components/
│   ├── ui/                    # shadcn components (auto-generated)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── badge.tsx
│   │   ├── spinner.tsx
│   │   ├── separator.tsx
│   │   ├── tabs.tsx
│   │   ├── alert.tsx
│   │   └── label.tsx
│   ├── Layout.tsx             # App shell (uses ui components)
│   ├── NavBar.tsx             # Navigation
│   ├── PageHeader.tsx         # Page titles
│   ├── FormField.tsx          # Form wrapper (uses Label, Input)
│   └── SearchInput.tsx        # Debounced search (uses Input)
├── lib/
│   └── utils.ts               # cn() utility for className merging
└── styles/
    └── globals.css            # Tailwind v4 imports + @theme config
```

### Utility Function

```typescript
// apps/web/src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

---

## Migration from Custom Components

### Components to Replace

| Old (custom SCSS) | New (shadcn) |
|-------------------|--------------|
| `Button` | `ui/button` |
| `Input` | `ui/input` + `ui/label` |
| `Modal` | `ui/dialog` |
| `Table` | `ui/table` |
| `Card` | `ui/card` |
| `Spinner` | `ui/spinner` (custom) |
| `Select` | `ui/select` |
| `FormField` | Compose with `ui/label` |

### Components to Keep (rebuild with Tailwind)

| Component | Reason |
|-----------|--------|
| `Layout` | App-specific shell |
| `NavBar` | App-specific navigation |
| `PageHeader` | App-specific header |
| `SearchInput` | Custom debounce logic |

---

## Installation

### Dependencies (Tailwind CSS v4)

```bash
# Tailwind CSS v4 with Vite plugin (recommended for Vite projects)
pnpm add tailwindcss @tailwindcss/vite

# shadcn/ui dependencies
pnpm add class-variance-authority clsx tailwind-merge
pnpm add @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs
pnpm add @radix-ui/react-label @radix-ui/react-separator @radix-ui/react-slot
```

### Critical: Pin @radix-ui/react-primitive

**Issue:** `@radix-ui/react-primitive` v1.0.3+ silently introduced a dependency on `@mui/base`, causing build failures in projects that also use Material UI.

**Symptom:** `FATAL ERROR: Type 'unstable_ClassNameGenerator' is not assignable...`

**Fix:** Pin to v1.0.2 (last version before the `@mui/base` dependency) in your root `package.json`:

```json
{
  "pnpm": {
    "overrides": {
      "@radix-ui/react-primitive": "1.0.2"
    }
  }
}
```

After adding the override, run `pnpm install` to apply.

> Source: TechResolve Blog, "Did shadcn/ui just silently add Base UI support?" (Dec 22, 2025)

### Vite Configuration

```typescript
// apps/web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // Tailwind v4 Vite plugin
  ],
});
```

**Note:** With `@tailwindcss/vite`, you don't need `postcss.config.js` or `autoprefixer`. The Vite plugin handles everything.

### CSS Entry Point

```css
/* apps/web/src/styles/globals.css */
@import "tailwindcss";

@theme {
  /* Your custom theme variables here */
}
```

### shadcn/ui CLI Setup (Monorepo)

The shadcn CLI now supports monorepos natively (December 2024 update).

```bash
# Initialize shadcn in the web app
cd apps/web
pnpm dlx shadcn@latest init
```

#### Monorepo components.json Configuration

**Important:** For Tailwind CSS v4, leave the `tailwind.config` field empty.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

#### Add Components

```bash
# Add components (run from apps/web directory)
pnpm dlx shadcn@latest add button input label card table dialog select badge tabs separator alert
```

---

## Usage Examples

### Button Variants

```tsx
import { Button } from "@/components/ui/button";

// Primary action
<Button>Kaydet</Button>

// Secondary
<Button variant="secondary">Iptal</Button>

// Danger
<Button variant="destructive">Sil</Button>

// Ghost (subtle)
<Button variant="ghost">Geri</Button>

// With loading
<Button disabled>
  <Spinner className="mr-2 size-4" />
  Yukleniyor...
</Button>
```

### Form Field

```tsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

<div className="space-y-2">
  <Label htmlFor="empId">Personel No</Label>
  <Input id="empId" type="number" placeholder="12345" />
  <p className="text-sm text-destructive">Bu alan zorunludur</p>
</div>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>WO-2026-001</CardTitle>
    <CardDescription>Musteri: ABC Sirketi</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Planlanan: 1.500 kg</p>
    <p>Kalan: 500 kg</p>
  </CardContent>
  <CardFooter>
    <Button>Detay</Button>
  </CardFooter>
</Card>
```

### Dialog (Modal)

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Mola Nedeni Secin</DialogTitle>
    </DialogHeader>
    <div className="py-4">
      {/* Break reason list */}
    </div>
    <DialogFooter>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>Iptal</Button>
      <Button onClick={handleSave}>Kaydet</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Responsive Design

Primary target is desktop monitors. Mobile support can be added later using Tailwind breakpoints:

```tsx
// Desktop-first, add mobile later
<div className="p-6 md:p-4 sm:p-2">
  <h1 className="text-2xl md:text-xl sm:text-lg">Title</h1>
</div>
```

Breakpoints (default Tailwind):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Container Queries (v4 Native!)

Tailwind v4 includes native container query support without plugins:

```tsx
<div className="@container">
  <div className="@md:flex @md:gap-4">
    {/* Responsive to container, not viewport */}
  </div>
</div>
```

---

## Custom Utilities (v4 Syntax)

In v4, use `@utility` instead of `@layer utilities`:

```css
/* Before (v3) */
@layer utilities {
  .tab-4 {
    tab-size: 4;
  }
}

/* After (v4) */
@utility tab-4 {
  tab-size: 4;
}
```

Custom utilities defined with `@utility` automatically work with all variants (`hover:`, `focus:`, `lg:`, etc.).

---

## References

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/)
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [shadcn/ui Monorepo Setup](https://ui.shadcn.com/docs/monorepo)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [OKLCH Color Converter](https://oklch.com/)
- [i18n-turkish-locale.md](./i18n-turkish-locale.md) - Turkish translations for UI text
