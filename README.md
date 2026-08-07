# TPM Board

Kanban board for project management with subtasks, color labels, dashboards, and team collaboration. Built with **React 19 + Vite** and **Payload CMS** as backend.

## Stack

- **React 19** + **Vite 8**
- **Payload CMS** (REST API) for backend
- No TypeScript, no external state library — plain React with a context-based architecture

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

| Command            | Description                       |
|--------------------|-----------------------------------|
| `pnpm dev`         | Start the dev server              |
| `pnpm build`       | Production build into `dist/`     |
| `pnpm preview`     | Preview the production build      |
| `pnpm lint`        | Run ESLint                        |
| `pnpm lint:fix`    | Run ESLint with `--fix`           |
| `pnpm format`      | Format source with Prettier       |
| `pnpm format:check`| Verify formatting without writing |

## Architecture

The app is split into 4 specialized contexts, each owning a specific concern:

```
src/context/
├── UIContext.jsx       — theme, modals, filters, search, view, active card
├── AuthContext.jsx     — user, login, logout, token
├── BoardContext.jsx    — boards, columns, members, board/column actions
├── TaskContext.jsx     — cards, subtasks, card actions
└── AppProviders.jsx    — composes the four providers
```

Communication across contexts uses a tiny **event bus on `window`** (`kanban:userAuthenticated`, `kanban:userLoggedOut`, `kanban:boardUpdated`, `kanban:boardDeleted`, `kanban:columnDeleted`) to keep them decoupled.

### Hooks

- `useUI()` — UI state
- `useAuth()` — auth state and actions
- `useBoards()` — boards, columns, members
- `useTasks()` — cards, subtasks, task actions

### Key utilities

- `src/utils/columnHelpers.js` — `getCompletedColumn`, `isCompletedColumn`
- `src/utils/apiQuery.js` — `buildWhereInParam` (Payload-compatible `where[id][in]=a,b,c` syntax)
- `src/hooks/useDebouncedValue.js` — debounce for the search input

## Features

- Boards with members, owners, and default columns
- Drag & drop of cards between columns and reorder
- Drag & drop of columns to reorder
- Subtasks (checklists) with assignees and due dates
- Color labels per card with custom names per board
- Dashboard with task metrics (total, completed, overdue, subtask rate)
- Dark / light theme toggle
- Localized UI in Spanish

## Notes

- The JWT token is stored in `localStorage`. For a production-grade deployment consider moving it to an HTTP-only cookie.
- The column-title uniqueness trick in Payload is implemented by encoding the display name + a timestamp suffix; only the prefix is shown in the UI.
