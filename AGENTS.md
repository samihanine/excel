# Technical Stack

- TanStack Start and TanStack Router
- React 19
- TypeScript in strict mode
- Vite
- Tailwind CSS 4
- shadcn/ui with Base UI
- TanStack Query
- Vitest

# Code Rules

- Write frontend code by default. Use server routes only for secrets or external APIs.
- Use TypeScript. Do not use `any`.
- Use components from `src/components/ui` before creating new UI primitives.
- Use TanStack Query for all asynchronous requests.
- Keep query keys stable and invalidate related queries after mutations.
- Keep API code in `src/lib` and UI state in hooks or components.
- Use the `@/` import alias for files in `src`.
- Handle loading, empty, and error states.
- Keep components small and accessible.
- Run lint, typecheck, and build before finishing.
- Put Vitest files in `test/`, never next to the source.
- Keep the number of test files low: group by domain, extend an existing file, do not add one test file per module.

# Structure

- `src/components`: Application components.
- `src/components/ui`: Shared shadcn/ui components.
- `src/hooks`: Reusable React hooks and TanStack Query hooks.
- `src/lib`: API clients, schemas, and domain utilities.
- `src/tools`: Actions DAX, visuels et téléchargement.
- `src/agents`: Agents.
- `src/schemas`: Schemas.
- `src/routes`: TanStack Router routes.
- `test`: Vitest, regroupés par domaine (peu de fichiers).
- `public`: Static assets.
