# Component Sandbox Pages

Isolated development environments for building and iterating on components before integration into the main app.

## Available Sandboxes

### 1. **MessageComposer Sandbox**
📍 **URL**: [http://localhost:3000/dev/composer-sandbox](http://localhost:3000/dev/composer-sandbox)

**Purpose**: Perfect the MessageComposer component design and layout in isolation.

**Features**:
- Live component preview with design token styling
- Toggle loading state to test disabled UI
- Switch depth modes (quick, balanced, in-depth)
- Real-time debug info (loading state, depth, last message)
- Message history log
- Design checklist for verification

**Current Status**: 
- ✅ Component built with design tokens
- ✅ All colors from `tokens.json` integrated
- ✅ Spacing, border radius using token system
- 🔄 Layout and visual refinement in progress

**When Ready to Integrate**:
1. Review sandbox at `/dev/composer-sandbox`
2. Once satisfied, swap in ChatInterface:
   - Change: `import { ChatInput }` → `import { MessageComposer }`
   - Change: `<ChatInput ... />` → `<MessageComposer ... />`
3. Delete old ChatInput component (or keep as reference)

---

## Design System Reference

All components should use tokens from `/lib/design-tokens.ts`:

```tsx
import { designTokens as tokens } from '@/lib/design-tokens';

// Usage
style={{
  backgroundColor: tokens.colors.gray[100],
  padding: tokens.spacing.md,
  borderRadius: tokens.radius.lg,
}}
```

### Available Tokens
- **Spacing**: `xs` (4px), `sm` (8px), `md` (16px), `lg` (32px), `xl` (64px)
- **Radius**: `sm` (4px), `md` (8px), `lg` (16px)
- **Colors**: Full palette (gray, red, orange, yellow, green, blue, purple, pink) with 100-900 shades

---

## Development Workflow

1. **Create sandbox page** for new component
2. **Build component** with full token integration
3. **Test in isolation** at `/dev/[component]-sandbox`
4. **Iterate** based on visual feedback
5. **Integrate** into main app once approved
6. **Archive** sandbox page or keep for reference

---

## Quick Links

- [Design Tokens](../../lib/design-tokens.ts)
- [Global Styles](../globals.css)
- [tokens.json](../../public/design-tokens.json)
