# Carrier Chat — Project Guidelines

## Component Sandbox → Integration Rule

When integrating a component from its sandbox page into the main app, the rendered
output must be visually 1:1 with the sandbox. Follow these rules exactly.

### 1. Never add wrapper margins that fight the component's own spacing

The sandbox renders MessageComposer (and all sandboxed components) inside a neutral
container with positive padding only — never negative margins. When placing a component
in the main app, do NOT wrap it in negative-margin helpers like `-mx-4 -mb-4` unless
the component's own sandbox wrapper uses the same technique. If you need the component
to extend to an edge, do that at the layout level, not by fighting the component's
natural box with negative offsets.

### 2. Match the sandbox container constraints exactly

Before integrating, read the sandbox wrapper and note:
- `max-width` (sandbox uses max-width: 600px with auto margins for MessageComposer)
- `padding` (sandbox uses p-8 / 32px around the preview area)
- `overflow` (sandbox never clips with overflow-hidden around the component)
- `border-radius` (sandbox lets the component's own 16px radius fully render)

Reproduce those same constraints in the integration wrapper. If the real layout cannot
afford 32px of padding, adjust the sandbox first, get approval, then integrate.

### 3. Never put overflow-hidden on a direct ancestor of a component unless the sandbox does too

An `overflow: hidden` ancestor clips border-radius, box-shadow, and focus rings.
In ChatInterface the `flex flex-col flex-1 overflow-hidden` div sits just two levels
above MessageComposer and clips its right and bottom edges. If you add overflow-hidden
anywhere in a layout that contains a sandboxed component, check that it does not clip
the component's bounding rect against the viewport or panel edge.

### 4. The component must not bleed to the viewport edge

After integration, run this quick check in the browser console:
```js
const el = document.querySelector('[data-component="MessageComposer"]'); // or whatever root attr
const r = el.getBoundingClientRect();
console.assert(r.right < window.innerWidth, 'composer bleeds right');
console.assert(r.bottom < window.innerHeight, 'composer bleeds bottom');
console.assert(r.left > 0, 'composer bleeds left');
```
If any assertion fails, fix the wrapper before considering the integration done.

### 5. Add a `data-component` attribute to every sandboxed component's root element

Every component that has a sandbox page should have `data-component="ComponentName"`
on its outermost DOM element. This makes it unambiguous to inspect and diff.

### 6. The sandbox page IS the spec — never adjust a component to fit a broken layout

If the component doesn't look right after integration, fix the *layout wrapper* in the
consuming page (ChatInterface, etc.), not the component itself. The sandbox is the
source of truth. The only time the component file should change is when the sandbox
view is updated and approved first.

### 7. Sandbox wrapper pattern to reuse

When in doubt, wrap the component in the consuming layout exactly like the sandbox does:
```jsx
{/* Correct integration wrapper — mirrors ComposerSandboxPage */}
<div className="w-full max-w-[600px] mx-auto">
  <MessageComposer ... />
</div>
```

Do NOT use:
```jsx
{/* Wrong — negative margins cancel padding and bleed the component to edges */}
<div className="flex-shrink-0 -mx-4 -mb-4">
  <MessageComposer ... />
</div>
```

---

## Design Tokens

All components must use tokens from `/lib/design-tokens.ts` instead of hardcoded colors/spacing.

```tsx
import { designTokens as tokens } from '@/lib/design-tokens';

// Usage
style={{
  backgroundColor: tokens.colors.gray[100],
  padding: tokens.spacing.md,
  borderRadius: tokens.radius.lg,
}}
```

Source: `/public/design-tokens.json` (Tokens Studio format)

---

## Sandbox Pages

Component sandboxes live at `/app/dev/[component]-sandbox/page.tsx`.

See `/app/dev/SANDBOX_README.md` for full development workflow.
