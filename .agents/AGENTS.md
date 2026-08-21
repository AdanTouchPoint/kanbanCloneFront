# AGENTS.md — Conventions for AI agents

These guidelines reflect the patterns agreed on this codebase. Follow them when proposing or generating changes.

## State

- **Server state** lives in `src/queries/` (TanStack Query). Never duplicate it in `useState` + `useEffect`.
- **UI state** lives in `src/context/UIContext.jsx` (theme, modals, search, view, active card).
- **Cross-cutting derived state** lives in `src/context/BoardContext.jsx` and `src/context/TaskContext.jsx`. They expose values derived from queries plus wiring for optimistic mutations via `queryClient.setQueryData`.
- **No `window` event bus**. All cross-context communication flows through the query cache.

## React hooks

- **Do not call `setState` synchronously inside `useEffect`**. The `react-hooks/set-state-in-effect` ESLint rule is enabled. Either:
  - Derive state during render, or
  - Use a `key={dependency}` on a child component so React remounts it when the dependency changes.
- **`exhaustive-deps` is `error`**. Either include all dependencies or refactor to avoid the effect.
- **Lazy initial state**: `useState(() => expensive())` for non-trivial initializers.
- **Memoize context values**: if a context value is built from `??`, `||`, or an object literal, wrap it in `useMemo` to avoid cascading renders.

## Components

- **Prefer composition over boolean props.** A `CardModal` with `isEditing`, `isDraft`, `isForwarding` flags is a smell. Split into explicit variants.
- **Compound components** for complex UIs: `CardModalForm` mounted by `CardModal` with a `key={card.id}` to remount on card change.
- **Children over render props** when the parent does not need to feed data back.
- **Memoize leaf components** that receive derived arrays of objects (Card, Column).
- **Custom comparator** when memo is needed but the default shallow comparison is too strict.

## Drag and drop

- `@dnd-kit` is the only DnD library. Never reach for native HTML5 DnD.
- `SortableCard` and `SortableColumn` wrap the display components with `useSortable`.
- `DndContextProvider` provides sensors and `DragOverlay`. Configure `accessibility.announcements` for screen reader support.
- Cards and columns identify their type via `data: { type: 'card' | 'column', ... }` on the sortable item.

## Accessibility

- All modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap (`useFocusTrap`), Escape to close, focus return on close.
- All form fields: `<label htmlFor>` with `useId()`. Errors use `aria-invalid` + `aria-describedby` + `role="alert"`.
- Login: `autocomplete="username"` / `"current-password"`.
- Decorative icons: `aria-hidden="true"`. Interactive icon-only buttons: `aria-label`.
- Visible focus rings: `*:focus-visible` with 2px outline using `--primary`.
- Respect `prefers-reduced-motion`.
- Provide a skip link to the main content.

## Styling

- All design tokens live in `src/index.css` as CSS variables. Use them — never hard-code colors, raw spacing, or radii.
- Display font: `var(--font-display)` (Instrument Serif).
- UI font: `var(--font-sans)` (Inter Tight Variable).
- Spacing scale: `var(--space-1)` through `var(--space-8)`.
- Radii: `var(--radius-xs)` through `var(--radius-full)`.
- Transitions: `var(--transition-fast|normal|slow|spring)`.
- Shadows: `var(--shadow-sm|md|lg|xl|glow)`. No black shadows.

## Tests

- Vitest + React Testing Library.
- Tests live next to the file they cover: `columnHelpers.test.js`, `Card.jsx.test.jsx`, etc.
- Mock `fetch` via `vi.fn()` or MSW. Do not hit the real Payload CMS.
- Every util and transformer should have a test. Components worth testing: `ConfirmDialog`, `CardModal`, `BoardModal`, `Column`, `Card`.

## Commands

- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm test` — Vitest
- `pnpm test:watch` — Vitest in watch mode
