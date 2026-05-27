---
name: monolithic-components
description: Enforce monolithic code structure — no unnecessary component extraction, use shadcn/ui first, create custom components only as last resort. Use when writing, reviewing, or refactoring UI code in this project.
---

# Component Structure Rules

This project follows a **monolithic, simple code structure**. The default is to keep code together, not split it apart.

## The Golden Rule

**Do not extract a new component unless it is reused in 2+ places OR it contains complex isolated state.**

A 30-line JSX block inside a page is fine. A 100-line JSX block that is only used once is also fine. Extract only when duplication or complexity demands it.

## Decision Tree

Before creating any new component file, ask:

1. **Is this already a shadcn/ui component?** → Use that. Install it if not yet added.
2. **Is this used in exactly one place?** → Keep it inline in the parent file.
3. **Is this used in 2+ places?** → Extract to `components/ui/` only then.
4. **Is this a complex form/table/modal with its own state?** → May extract, but still verify it's not duplicating a shadcn primitive.

## shadcn/ui First

Always check shadcn before writing any UI primitive. The full component list:

**Layout & Structure:** `card`, `separator`, `sheet`, `dialog`, `drawer`, `collapsible`, `resizable`

**Forms & Inputs:** `button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `slider`, `toggle`, `toggle-group`, `form` (with react-hook-form)

**Data Display:** `table`, `badge`, `avatar`, `progress`, `skeleton`, `calendar`

**Navigation:** `breadcrumb`, `navigation-menu`, `tabs`, `pagination`, `sidebar`, `menubar`

**Feedback:** `alert`, `alert-dialog`, `toast` (sonner), `tooltip`, `popover`, `hover-card`

**Typography:** `label`

**Overlays:** `dropdown-menu`, `context-menu`, `command` (cmdk)

**Charts:** `chart` (recharts wrapper)

Install a shadcn component:
```bash
npx shadcn@latest add <component-name>
```

Check if shadcn covers a use case before writing anything custom.

## Where Files Live

```
app/
  page.tsx          ← pages stay fat, inline JSX is fine
  layout.tsx
  (routes)/
    page.tsx
components/
  ui/               ← shadcn components live here (auto-generated)
  (custom)/         ← ONLY extracted reusable components go here
```

Do **not** create a `components/` subfolder for a one-off section of a single page.

## What NOT to Do

- Do not extract `<PageHeader />`, `<SectionTitle />`, `<FormRow />` when used once
- Do not create wrapper components that just pass props through
- Do not split a form into `<FormStep1 />`, `<FormStep2 />` unless they render independently
- Do not create a `<Layout />` component wrapping a single div with className
- Do not create `<Icon />` wrappers — use lucide-react directly

## What IS Allowed as a Custom Component

- A data table with sorting/filtering logic that is used in 3+ pages
- A complex multi-step form with its own state machine
- A chart wrapper that maps domain data to recharts props (reused across reports)
- An authenticated route wrapper used on every protected page

## Code Style

- Inline small JSX in the parent — a 40-line section block inside a page is normal
- Use Tailwind classes directly, never inline styles
- Prefer `cn()` from `lib/utils` for conditional classes
- One file per route/page, not one file per section

## Review Checklist

When reviewing or writing UI code, verify:

- [ ] No new component file created for single-use UI
- [ ] shadcn equivalent checked before any custom primitive
- [ ] No wrapper components that only add a className
- [ ] Page files are allowed to be long — do not refactor length for its own sake
