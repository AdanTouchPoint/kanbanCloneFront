# TPM Board

Kanban board for project management with subtasks, color labels, dashboards, and team collaboration. Built with **React 19 + Vite 8** and **Payload CMS** as backend.

## Stack

- **React 19** + **Vite 8** (Rolldown)
- **TanStack Query 5** for server state — boards, users, columns, tasks
- **@dnd-kit** for accessible drag and drop (Pointer, Touch, Keyboard sensors)
- **@fontsource** for self-hosted typography (Instrument Serif + Inter Tight)
- **Payload CMS** (REST API) as backend
- No TypeScript, no external state library — plain React with focused contexts

## Getting started

### 1. Install

```bash
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and adjust the API URL if needed:

```bash
cp .env.example .env
```

```env
VITE_API_URL=https://kanban-clone-back.vercel.app/api
```

### 3. Run

```bash
pnpm dev
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build into `dist/` |
| `pnpm preview` | Preview the production build |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Run ESLint with `--fix` |
| `pnpm format` | Format source with Prettier |
| `pnpm format:check` | Verify formatting without writing |
| `pnpm test` | Run tests once with Vitest |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |

## Architecture

### State

Three layers, each with a single responsibility:

1. **Server state** — `src/queries/` (TanStack Query). Boards, users, columns, tasks.
2. **UI state** — `src/context/UIContext.jsx` (theme, modals, search, view, active card).
3. **Auth state** — `src/context/AuthContext.jsx` (user, login, logout, init).
4. **Cross-cutting helpers** — `src/context/BoardContext.jsx`, `src/context/TaskContext.jsx` expose derived values and wiring around the queries plus optimistic mutations via `queryClient.setQueryData`.

There is no `window` event bus. All cross-context communication happens through the query cache.

```
src/
├── queries/
│   ├── queryClient.js            # QueryClient factory (staleTime, retry)
│   ├── keys.js                   # Query key factories (boardKeys, userKeys, ...)
│   ├── useBoardsQuery.js
│   ├── useUsersQuery.js
│   ├── useBoardColumnsQuery.js
│   └── useBoardTasksQuery.js
├── context/
│   ├── AppProviders.jsx          # QueryClient + UI/Auth/Board/Task providers
│   ├── UIContext.jsx
│   ├── AuthContext.jsx
│   ├── BoardContext.jsx
│   └── TaskContext.jsx
├── hooks/
│   ├── useDebouncedValue.js
│   └── useFocusTrap.js
├── components/
│   ├── dnd/
│   │   ├── DndContextProvider.jsx
│   │   ├── SortableCard.jsx
│   │   └── SortableColumn.jsx
│   ├── Board.jsx
│   ├── Column.jsx
│   ├── Card.jsx
│   ├── CardModal.jsx
│   ├── BoardModal.jsx
│   ├── ConfirmDialog.jsx
│   ├── Dashboard.jsx
│   ├── Sidebar.jsx
│   ├── Login.jsx
│   ├── ErrorBoundary.jsx
│   └── LoadingScreen.jsx
├── services/
│   └── api.js                    # Payload REST client + transformers
├── utils/
│   ├── columnHelpers.js
│   └── apiQuery.js
├── styles/                       # CSS files per component
├── test/
│   └── setup.js                  # Vitest global setup
├── App.jsx
├── main.jsx
└── index.css                     # Design tokens (CSS variables)
```

### Drag and drop

Powered by `@dnd-kit`. Sensors: Pointer (5px distance), Touch (150ms delay), Keyboard (sortable coordinates). DndContext with `announcements` exposes `aria-live` updates; cards and columns are sortable via `SortableContext`. The `DragOverlay` shows a preview while dragging.

### Accessibility

- All modals have `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap (`useFocusTrap`), Escape to close, focus return on close.
- Form fields are labelled with `<label htmlFor>` + `useId()`. Errors use `aria-invalid` + `aria-describedby` + `role="alert"`.
- Login: `autocomplete="username"` / `"current-password"`.
- Skip link reveals a "Saltar al tablero" anchor on focus.
- Keyboard DnD: `Space` to grab, arrow keys to move, `Enter` to drop, `Escape` to cancel.
- `prefers-reduced-motion` disables animations and transitions.

### Design system

Soft tactile aesthetic with warm off-white background, terracotta primary, sage accent.

- Display: **Instrument Serif** (italic headings at 36px+).
- UI: **Inter Tight Variable** (body, controls, captions).
- Mono: JetBrains Mono / SF Mono fallback.
- All colors, radii, spacing, and motion are exposed as CSS variables in `src/index.css`.
- Soft shadows (`hsl(20 30% 20% / 0.08)`-style) instead of pure black.

### Bundle

`pnpm build` produces:

- `index.js` (main): **50 kB / 14 kB gzip**
- `vendor-react`: 178 kB / 56 kB gzip
- `vendor-dnd`: 60 kB / 20 kB gzip
- `vendor-query`: 34 kB / 10 kB gzip
- `CardModal`, `BoardModal`, `Dashboard`, `ConfirmDialog`: lazy-loaded

## Features

- Boards with members, owners, and default columns
- Drag & drop of cards between columns and reorder (Pointer / Touch / Keyboard)
- Drag & drop of columns to reorder
- Subtasks (checklists) with assignees, due dates, and overdue warnings
- Color labels per card with custom names per board
- Dashboard with task metrics (total, completed, overdue, subtask rate)
- Dark / light theme toggle
- Spanish UI

## Development conventions

- **Hooks**: never call `setState` synchronously inside `useEffect`. Derive state during render or use a `key` to remount subcomponents when their inputs change.
- **Mutations**: prefer `queryClient.setQueryData` for optimistic updates, then revalidate via `queryClient.invalidateQueries`. Mutations to multiple keys are coordinated by the context that owns the data.
- **Components**: prefer composition over boolean props. Sub-components like `CardModalForm` receive draft state via props and call back via `onSave` to keep the parent slim.
- **Styling**: use the design tokens in `index.css`. Avoid hard-coded colors, raw values, and ad-hoc spacing.
- **Tests**: every change to a util or transformer should land with a test in `*.test.js(x)` alongside the file.

## Notes

- The JWT token is stored in `localStorage`. For a production-grade deployment consider moving it to an HTTP-only cookie.
- The column-title uniqueness trick in Payload is implemented by encoding the display name + a timestamp suffix; only the prefix is shown in the UI.
- The "completed" column is detected by keyword in `columnHelpers.js`. A future iteration should add a flag to the column entity in the backend.
